/**
 * ============================================================================
 * GENERIC HTTP CLIENT — hardened against timeouts, unstable networks, CSRF,
 * concurrent 401 responses (including late arrivals outside the overlap
 * window), improper retries on non-idempotent methods, and credential leaks
 * cross-origin.
 */

export type HttpMethod = "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ResponseType = "auto" | "json" | "text" | "blob" | "arrayBuffer";

const STATE_CHANGING_METHODS = new Set<HttpMethod>([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

// Methods retried by default. Deliberately restricted to GET/HEAD:
// PUT and DELETE are idempotent *according to the HTTP spec*, but in practice
// many backends log, charge, or trigger a webhook per call—automatic retries
// in these cases duplicate side effects. PUT/DELETE remain available through
// an explicit `retry.shouldRetry` when the endpoint is demonstrably safe to
// repeat.
const SAFE_TO_RETRY_METHODS = new Set<HttpMethod>(["GET", "HEAD"]);

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_UPLOAD_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_CSRF_HEADER_NAME = "X-CSRF-Token";

export interface HttpError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
  /** Field errors when the backend returns a structured format (see parseErrorBody). */
  fields?: Record<string, string>;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
  /** true when the error came from an external abort (caller's signal), not our timeout. */
  isCancelledError?: boolean;
  isAuthError?: boolean;
  url?: string;
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (
    error: HttpError,
    method: HttpMethod,
    attempt: number,
  ) => boolean;
}

/**
 * Auth adapter
 * @param getAccessToken - a function that returns the current access token (or undefined if not available).
 * @param refreshAccessToken - a function that refreshes the access token. It should throw an error if the refresh fails.
 * @param onAuthFailure - an optional function that is called when the access token cannot be refreshed (e.g., user needs to log in again).
 */
export interface AuthAdapter {
  getAccessToken: () => string | undefined | Promise<string | undefined>;
  refreshAccessToken: () => Promise<void>;
  onAuthFailure?: () => void;
}

/**
 * CSRF adapter
 * @param getToken - a function that returns the current CSRF token (or undefined if not available).
 * @param setToken - a function that sets the current CSRF token.
 * @param headerName - an optional string that specifies the name of the header to use for the CSRF token. Defaults to "X-CSRF-Token".
 *
 * ATENÇÃO: a implementação padrão (in-memory) exige que o backend exponha
 * o header via `Access-Control-Expose-Headers` — sem isso, o browser esconde
 * o header do JS e o token nunca é capturado. Isso é uma dependência externa,
 * não uma garantia do client: valide no backend antes de confiar nisso.
 */
export interface CsrfAdapter {
  getToken: () => string | undefined;
  setToken: (token: string | undefined) => void;
  headerName?: string;
}

/**
 * HttpClientConfig
 * @param baseURL - the base URL for all requests. If not provided, requests will be made to the relative path.
 * @param defaultHeaders - an object containing default headers to be sent with every request.
 * @param requestTimeoutMs - the timeout in milliseconds for regular requests. Defaults to 15 seconds.
 * @param uploadTimeoutMs - the timeout in milliseconds for file upload requests. Defaults to 5 minutes.
 * @param credentials - the credentials option for fetch for same-origin requests (or requests without a baseURL). Defaults to "include".
 * @param allowCredentialsCrossOrigin - when true, also allows `credentials: "include"` for absolute URLs with a DIFFERENT origin from the baseURL. Defaults to false — by default the client never sends cookies/credentials to a cross-origin destination without an explicit request (see `resolveCredentials`).
 * @param auth - an optional AuthAdapter for handling authentication.
 * @param csrf - an optional CsrfAdapter for handling CSRF tokens.
 * @param retry - an optional RetryOptions object for configuring retry behavior.
 * @param onRequest - an optional callback that is called before each request is sent.
 * @param onResponse - an optional callback that is called after each response is received.
 * @param onError - an optional callback that is called when a request fails
 */
export interface HttpClientConfig {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  requestTimeoutMs?: number;
  uploadTimeoutMs?: number;
  credentials?: RequestCredentials;
  allowCredentialsCrossOrigin?: boolean;
  auth?: AuthAdapter;
  csrf?: CsrfAdapter;
  retry?: RetryOptions;
  onRequest?: (info: {
    url: string;
    init: RequestInit;
  }) => void | Promise<void>;
  onResponse?: (info: {
    url: string;
    response: Response;
  }) => void | Promise<void>;
  onError?: (info: { url: string; error: HttpError }) => void | Promise<void>;
}

/**
 * RequestOptions
 * @param method - the HTTP method to use for the request. Defaults to "GET".
 * @param body - the body of the request. If provided, it will be JSON-stringified unless it's a FormData object.
 * @param params - an object containing query parameters to be appended to the URL.
 * @param headers - an object containing additional headers to be sent with the request.
 * @param signal - an AbortSignal that can be used to abort the request.
 * @param timeoutMs - the timeout in milliseconds for this request. Overrides the default timeout if provided.
 * @param responseType - the expected response type. Can be "auto", "json", "text", "blob", or "arrayBuffer". Defaults to "auto".
 * @param credentials - overrides automatic credential resolution for this specific request.
 * @param skipAuth - if true, skips adding the Authorization header and does not attempt to refresh the token on 401 responses.
 * @param skipAuthRetry - if true, allows the request to be authenticated but does not retry on 401 responses.
 * @param retry - an optional RetryOptions object for configuring retry behavior for this specific request. If set to false, disables retries for this request.
 */
export interface RequestOptions<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  responseType?: ResponseType;
  credentials?: RequestCredentials;
  skipAuth?: boolean;
  skipAuthRetry?: boolean;
  retry?: RetryOptions | false;
}

/**
 * Creates an in-memory CSRF adapter that stores the CSRF token in memory. This is useful for single-page applications where the CSRF token is obtained from the server and needs to be included in subsequent requests.
 * @param headerName - an optional string that specifies the name of the header to use for the CSRF token. Defaults to "X-CSRF-Token".
 * @returns a CsrfAdapter that can be used with the HttpClient.
 */
function createInMemoryCsrfAdapter(
  headerName = DEFAULT_CSRF_HEADER_NAME,
): CsrfAdapter {
  let token: string | undefined;
  return {
    getToken: () => token,
    setToken: (t) => {
      token = t;
    },
    headerName,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * isAbsoluteUrl indicates whether `path` is already a complete URL (http/https) instead of a relative path.
 * @param path - the string to test.
 * @returns true if `path` start with http:// or https://.
 */
function isAbsoluteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

/**
 * buildUrl constructs a full URL by combining a base URL, a path, and optional query parameters. It handles both absolute and relative paths, and appends query parameters in a URL-encoded format.
 * @param baseURL - the base URL to which the path will be appended. If the path is absolute, this parameter is ignored.
 * @param path - the path to append to the base URL. Can be absolute or relative.
 * @param params - an optional object containing query parameters to be appended to the URL. The keys and values will be URL-encoded.
 * @returns returns the constructed URL as a string.
 */
function buildUrl(
  baseURL: string | undefined,
  path: string,
  params?: RequestOptions["params"],
): string {
  const base = isAbsoluteUrl(path) ? path : `${baseURL ?? ""}${path}`;

  if (!params) return base;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.append(key, String(value));
  }
  const query = search.toString();
  if (!query) return base;

  return base.includes("?") ? `${base}&${query}` : `${base}?${query}`;
}

/**
 * isCrossOriginAbsolute indicates whether `path` is an absolute URL whose origin differs from the configured `baseURL`.
 * Used only to decide credentials by default — it never blocks the request itself.
 * @param path - the request path or URL.
 * @param baseURL - o baseURL configurado no client, se houver.
 * @returns true if `path` is absolute and points to an origin different from the baseURL (or no baseURL exists).
 */
function isCrossOriginAbsolute(
  path: string,
  baseURL: string | undefined,
): boolean {
  if (!isAbsoluteUrl(path)) return false;
  if (!baseURL) return true; // absolute URL without a configured baseURL: treat as external
  try {
    const pathOrigin = new URL(path).origin;
    const baseOrigin = new URL(
      isAbsoluteUrl(baseURL)
        ? baseURL
        : `${typeof window !== "undefined" ? window.location.origin : "http://localhost"}${baseURL}`,
    ).origin;
    return pathOrigin !== baseOrigin;
  } catch {
    return true; // origin could not be determined: assume the most restrictive case
  }
}

/**
 * resolveCredentials determines the request's `credentials` value. Rule: never
 * send credentials to an absolute cross-origin destination unless explicitly
 * requested (per request or through `allowCredentialsCrossOrigin` in the config).
 * Prevents leaking session cookies to a third-party API accidentally passed as
 * an absolute URL.
 * @param config - the HttpClient configuration.
 * @param perRequest - the `credentials` value passed for this specific request, if any.
 * @param path - the request path or URL.
 * @returns the RequestCredentials value to use with fetch.
 */
function resolveCredentials(
  config: HttpClientConfig,
  perRequest: RequestCredentials | undefined,
  path: string,
): RequestCredentials {
  if (perRequest) return perRequest;

  const crossOrigin = isCrossOriginAbsolute(path, config.baseURL);
  if (crossOrigin && !config.allowCredentialsCrossOrigin) {
    return "same-origin";
  }
  return config.credentials ?? "include";
}

/**
 * stringifyErrorValue attempts to extract a meaningful error message from various types of error values, including strings, arrays, and objects. It recursively traverses the structure to find a string message.
 * @param value - the error value to be stringified. It can be a string, an array, or an object.
 * @returns the error message as a string if found, or undefined if no message could be extracted.
 */
function stringifyErrorValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    const messages = value
      .map(stringifyErrorValue)
      .filter((m): m is string => Boolean(m));
    return messages.length ? messages.join(" ") : undefined;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of [
      "message",
      "detail",
      "error",
      "errors",
      "title",
    ] as const) {
      const message = stringifyErrorValue(record[key]);
      if (message) return message;
    }
    const fieldMessages = Object.values(record)
      .map(stringifyErrorValue)
      .filter((m): m is string => Boolean(m));
    if (fieldMessages.length) return fieldMessages.join(" ");
  }
  return undefined;
}

/**
 * if the message starts with a prefix like "SOME_ERROR: ", this function removes that prefix and returns the rest of the message. It is useful for cleaning up error messages that include error codes or identifiers.
 * @param message - the error message string from which the prefix should be removed.
 * @returns the cleaned-up error message without the prefix, or the original message if no prefix was found.
 */
function removeErrorCodePrefix(message: string): string {
  return message.replace(/^(?:[A-Z][A-Z0-9]*_ERROR\s*:?\s*)+/i, "").trim();
}

/**
 * extractFieldErrors extracts field errors in the structured `{ field: message }` format,
 * covering two common API error response formats:
 * - `{ fields: { email: "...", "items.0.price": "..." } }`
 * - FastAPI: `{ detail: [{ loc: ["body", "email"], msg: "..." }] }`
 * @param data - the error response body already parsed as JSON.
 * @returns a `{ field: message }` object if either format matches, or undefined otherwise (consumers fall back to the prose `message`).
 */
function extractFieldErrors(data: unknown): Record<string, string> | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;

  if (record.fields && typeof record.fields === "object") {
    const entries = Object.entries(record.fields as Record<string, unknown>)
      .map(([key, value]) => {
        const message = stringifyErrorValue(value);
        return message ? ([key, message] as const) : undefined;
      })
      .filter((e): e is readonly [string, string] => Boolean(e));
    if (entries.length) return Object.fromEntries(entries);
  }

  if (Array.isArray(record.detail)) {
    const fields: Record<string, string> = {};
    for (const item of record.detail) {
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      if (!Array.isArray(entry.loc)) continue;
      const key = entry.loc
        .filter((part) => part !== "body" && part !== "query")
        .map(String)
        .join(".");
      const message = stringifyErrorValue(entry.msg);
      if (key && message) fields[key] = message;
    }
    if (Object.keys(fields).length) return fields;
  }

  return undefined;
}

/**
 * parseErrorBody attempts to parse the body of an HTTP error response, which is expected to be a JSON string. It extracts the error message, code, field-level errors, and any additional details from the parsed object. If the body is empty or cannot be parsed as JSON, it returns an object with only the message (if available).
 * @param body - the raw response body as a string, which is expected to be in JSON format.
 * @returns a formatted object containing the error message, code, details, and fields extracted from the response body. If parsing fails, it returns an object with only the message (if available).
 */
function parseErrorBody(body: string): {
  message?: string;
  code?: string;
  details?: unknown;
  fields?: Record<string, string>;
} {
  if (!body.trim()) return {};

  try {
    const data: unknown = JSON.parse(body);
    const record =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : undefined;

    return {
      message: (() => {
        const message = stringifyErrorValue(data);
        return message ? removeErrorCodePrefix(message) : undefined;
      })(),
      code:
        typeof record?.code === "string"
          ? record.code
          : record?.error &&
              typeof record.error === "object" &&
              typeof (record.error as Record<string, unknown>).code === "string"
            ? ((record.error as Record<string, unknown>).code as string)
            : undefined,
      details: record?.errors ?? record?.details,
      fields: extractFieldErrors(data),
    };
  } catch {
    return { message: body.trim() };
  }
}

function makeHttpError(
  message: string,
  opts: Partial<HttpError> = {},
): HttpError {
  const error = new Error(message) as HttpError;
  Object.assign(error, opts);
  return error;
}

function defaultShouldRetry(error: HttpError, method: HttpMethod): boolean {
  if (!SAFE_TO_RETRY_METHODS.has(method)) return false;
  if (error.isTimeoutError || error.isNetworkError) return true;
  if (error.status && error.status >= 500) return true;
  return false;
}

/**
 * HttpClient is a utility class for making HTTP requests with support for authentication, CSRF protection, retries, and customizable request/response handling. It provides methods for common HTTP verbs (GET, POST, PUT, PATCH, DELETE) and allows for configuration of headers, timeouts, and response types.
 * It also handles automatic token refresh on 401 responses and can be extended with custom behavior through callbacks.
 * @param config - an optional HttpClientConfig object for configuring the HttpClient instance.
 * @param csrf - an optional CsrfAdapter for handling CSRF tokens. If not provided, an in-memory CSRF adapter is used by default.
 * @param refreshInFlight - a private property that tracks whether a token refresh is currently in progress, ensuring that multiple simultaneous 401 responses trigger only one refresh operation. NÃO cobre sozinho o retardatário que chega depois do refresh já ter resolvido — esse caso é tratado em handleUnauthorized comparando o token usado na request original contra o token atual.
 */
export class HttpClient {
  private readonly config: HttpClientConfig;
  private readonly csrf: CsrfAdapter;
  private refreshInFlight: Promise<void> | null = null;

  constructor(config: HttpClientConfig = {}) {
    this.config = config;
    this.csrf = config.csrf ?? createInMemoryCsrfAdapter();
  }

  get<T>(
    path: string,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T, TBody = unknown>(
    path: string,
    body?: TBody,
    options: Omit<RequestOptions<TBody>, "method" | "body"> = {},
  ): Promise<T> {
    return this.request<T, TBody>(path, { ...options, method: "POST", body });
  }

  put<T, TBody = unknown>(
    path: string,
    body?: TBody,
    options: Omit<RequestOptions<TBody>, "method" | "body"> = {},
  ): Promise<T> {
    return this.request<T, TBody>(path, { ...options, method: "PUT", body });
  }

  patch<T, TBody = unknown>(
    path: string,
    body?: TBody,
    options: Omit<RequestOptions<TBody>, "method" | "body"> = {},
  ): Promise<T> {
    return this.request<T, TBody>(path, { ...options, method: "PATCH", body });
  }

  delete<T>(
    path: string,
    options: Omit<RequestOptions, "method"> = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  async request<T, TBody = unknown>(
    path: string,
    options: RequestOptions<TBody> = {},
  ): Promise<T> {
    return this.executeWithRetry<T, TBody>(path, options, 0);
  }

  /**
   * executeWithRetry is a private method that attempts to execute an HTTP request with retry logic. It handles retries based on the provided RetryOptions or default behavior, and it will retry the request if certain conditions are met (e.g., network errors, timeouts, or server errors for idempotent methods). If the maximum number of retries is reached, the error is not retryable, or the error is a user-initiated cancellation, it throws the error.
   * @param path - the URL path for the request, which will be combined with the baseURL if provided.
   * @param options - an object containing request options such as method, body, headers, query parameters, and retry configuration.
   * @param attempt - the current attempt number, starting from 0. This is used to calculate the delay for retries and to determine if the maximum number of retries has been reached.
   * @returns a Promise that resolves to the response data of type T if the request is successful, or rejects with an HttpError if the request fails after all retry attempts.
   */
  private async executeWithRetry<T, TBody>(
    path: string,
    options: RequestOptions<TBody>,
    attempt: number,
  ): Promise<T> {
    const retryConfig =
      options.retry === false
        ? null
        : { ...this.config.retry, ...options.retry };

    try {
      return await this.executeOnce<T, TBody>(path, options);
    } catch (error) {
      const httpError = error as HttpError;

      if (!retryConfig) throw httpError;
      if (httpError.isCancelledError) throw httpError; // nunca retria abort do usuário

      const maxRetries = retryConfig.retries ?? 2;
      if (attempt >= maxRetries) throw httpError;

      const method = options.method ?? "GET";
      const shouldRetry = retryConfig.shouldRetry ?? defaultShouldRetry;
      if (!shouldRetry(httpError, method, attempt)) throw httpError;

      const baseDelay = retryConfig.baseDelayMs ?? 300;
      const maxDelay = retryConfig.maxDelayMs ?? 5_000;
      const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
      await sleep(delay);

      return this.executeWithRetry<T, TBody>(path, options, attempt + 1);
    }
  }

  /**
   * executeOnce is a private method that performs a single HTTP request without any retry logic. It constructs the request URL, sets up headers (including authentication and CSRF tokens), resolves credentials safely for cross-origin absolute URLs, handles timeouts, and processes the response. If the response indicates an authentication failure (401), it delegates to handleUnauthorized, passing along the token that was used for this specific request. If the request fails for other reasons, it throws an HttpError with details about the failure.
   * @param path - the URL path for the request, which will be combined with the baseURL if provided.
   * @param options - an object containing request options such as method, body, headers, query parameters, and timeout configuration.
   * @returns return a promise that resolves to the response data of type T if the request is successful, or rejects with an HttpError if the request fails.
   */
  private async executeOnce<T, TBody>(
    path: string,
    options: RequestOptions<TBody>,
  ): Promise<T> {
    const {
      method = "GET",
      body,
      params,
      headers: extraHeaders,
      signal,
      timeoutMs,
      responseType = "auto",
      credentials: perRequestCredentials,
      skipAuth = false,
      skipAuthRetry = false,
    } = options;

    const url = buildUrl(this.config.baseURL, path, params);
    const isFormData =
      typeof FormData !== "undefined" && body instanceof FormData;
    const timeout =
      timeoutMs ??
      (isFormData
        ? (this.config.uploadTimeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS)
        : (this.config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const combinedSignal = signal
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

    try {
      const headers: Record<string, string> = {
        ...this.config.defaultHeaders,
        ...extraHeaders,
      };

      if (!isFormData && body !== undefined) {
        headers["Content-Type"] ??= "application/json";
      }

      // Guardamos o token usado nesta request específica: se ela tomar 401,
      // comparamos contra o token vigente naquele momento pra saber se
      // outro fluxo já refrescou nesse meio-tempo (retardatário fora da
      // janela de overlap do single-flight).
      let tokenUsedForThisRequest: string | undefined;
      if (!skipAuth && this.config.auth) {
        tokenUsedForThisRequest = await this.config.auth.getAccessToken();
        if (tokenUsedForThisRequest)
          headers.Authorization = `Bearer ${tokenUsedForThisRequest}`;
      }

      if (STATE_CHANGING_METHODS.has(method)) {
        const csrfToken = this.csrf.getToken();
        if (csrfToken) {
          headers[this.csrf.headerName ?? DEFAULT_CSRF_HEADER_NAME] = csrfToken;
        }
      }

      const init: RequestInit = {
        method,
        headers,
        body:
          body === undefined
            ? undefined
            : isFormData
              ? (body as FormData)
              : JSON.stringify(body),
        signal: combinedSignal,
        credentials: resolveCredentials(
          this.config,
          perRequestCredentials,
          path,
        ),
      };

      await this.config.onRequest?.({ url, init });

      let response: Response;
      try {
        response = await fetch(url, init);
      } catch (fetchError) {
        throw this.normalizeFetchError(
          fetchError,
          method,
          url,
          timeout,
          controller.signal,
          signal,
        );
      }

      await this.config.onResponse?.({ url, response });

      // Captura/rotaciona CSRF de qualquer response — exige que o backend
      // exponha o header via Access-Control-Expose-Headers.
      const csrfHeaderName = this.csrf.headerName ?? DEFAULT_CSRF_HEADER_NAME;
      const newCsrfToken = response.headers.get(csrfHeaderName);
      if (newCsrfToken) this.csrf.setToken(newCsrfToken);

      if (
        response.status === 401 &&
        !skipAuth &&
        !skipAuthRetry &&
        this.config.auth
      ) {
        return this.handleUnauthorized<T, TBody>(
          path,
          options,
          tokenUsedForThisRequest,
        );
      }

      if (!response.ok) {
        throw await this.buildHttpError(response, url);
      }

      return (await this.parseResponse<T>(response, responseType)) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * handleUnauthorized handles the case when an HTTP request returns a 401 Unauthorized response. First it checks whether the access token has changed since the original request was made — if so, another concurrent flow already refreshed it (a "latecomer" arriving outside the single-flight overlap window), so it retries immediately with the current token instead of triggering a redundant refresh. Otherwise, it attempts to refresh the access token using the provided AuthAdapter (single-flight: concurrent callers await the same in-flight promise) and retries the original request once with the new token. If the token refresh fails or no AuthAdapter is configured, it throws an HttpError indicating that the session has expired.
   * @param path - the URL path for the original request that resulted in a 401 response.
   * @param options - an object containing the original request options, which will be used to retry the request after refreshing the token.
   * @param tokenUsedForThisRequest - the access token that was actually used on the request that received the 401, used to detect whether a refresh already happened elsewhere.
   * @returns returns a Promise that resolves to the response data of type T if the request is successful after refreshing the token (or after detecting an already-fresh token), or rejects with an HttpError if the token refresh fails or if there is no AuthAdapter configured.
   */
  private async handleUnauthorized<T, TBody>(
    path: string,
    options: RequestOptions<TBody>,
    tokenUsedForThisRequest: string | undefined,
  ): Promise<T> {
    const auth = this.config.auth;
    if (!auth)
      throw makeHttpError("Sessão expirada", {
        status: 401,
        isAuthError: true,
      });

    const currentToken = await auth.getAccessToken();
    if (currentToken && currentToken !== tokenUsedForThisRequest) {
      return this.executeOnce<T, TBody>(path, {
        ...options,
        skipAuthRetry: true,
      });
    }

    try {
      // Single-flight local: se já existe um refresh rodando, todas as
      // requests que tomarem 401 ao mesmo tempo esperam a MESMA promise
      // em vez de disparar refreshes paralelos.
      if (!this.refreshInFlight) {
        this.refreshInFlight = auth.refreshAccessToken().finally(() => {
          this.refreshInFlight = null;
        });
      }
      await this.refreshInFlight;
    } catch {
      auth.onAuthFailure?.();
      throw makeHttpError("Sessão expirada", {
        status: 401,
        isAuthError: true,
      });
    }

    const newToken = await auth.getAccessToken();
    if (!newToken) {
      auth.onAuthFailure?.();
      throw makeHttpError("Sessão expirada", {
        status: 401,
        isAuthError: true,
      });
    }

    // Re-executa uma única vez, sem permitir novo ciclo de refresh.
    return this.executeOnce<T, TBody>(path, {
      ...options,
      skipAuthRetry: true,
    });
  }

  /**
   * buildHttpError is a private method that constructs an HttpError object based on the response from a failed HTTP request. It reads the response body, attempts to parse it as JSON to extract error details (including structured field-level errors when the backend provides them), and creates an HttpError with the appropriate message, status code, and additional information. It also invokes the onError callback if provided in the HttpClientConfig.
   * @param response - the Response object from the failed HTTP request, which contains the status code and response body.
   * @param url - the URL of the request that resulted in the error, used for logging and debugging purposes.
   * @returns return a error object of type HttpError that encapsulates the details of the HTTP error, including the status code, error message, field errors, and any additional information extracted from the response body.
   */
  private async buildHttpError(
    response: Response,
    url: string,
  ): Promise<HttpError> {
    const rawBody = await response.text();
    const parsed = parseErrorBody(rawBody);
    const error = makeHttpError(
      parsed.message || `HTTP error ${response.status}`,
      {
        status: response.status,
        code: parsed.code,
        details: parsed.details,
        fields: parsed.fields,
        url,
      },
    );
    await this.config.onError?.({ url, error });
    return error;
  }

  /**
   * normalizeFetchError is a private method that normalizes different types of errors that can occur during an HTTP request made with the Fetch API. It distinguishes between network errors, timeout errors (our own AbortController expiring), user-initiated cancellation (the caller's external signal aborting — e.g. component unmount, a discarded react-query refetch), and other types of errors, creating a standardized HttpError object with relevant information. It also invokes the onError callback if provided in the HttpClientConfig.
   * @param error - the error object thrown by the Fetch API, which can be a DOMException for aborts, a TypeError for network errors, or any other type of error.
   * @param method - the HTTP method used for the request, which is included in the error message for context.
   * @param url - the URL of the request that resulted in the error, used for logging and debugging purposes.
   * @param timeout - the timeout value in milliseconds that was set for the request, used to indicate if the error was due to a timeout.
   * @param ownController - this client's own AbortSignal (the one driven by the timeout). Checked to tell our timeout apart from an external cancellation.
   * @param externalSignal - the caller-provided AbortSignal, if any.
   * @returns returns an HttpError object that encapsulates the details of the error, including whether it was a network error, timeout error, or a cancelled request, along with the relevant message and context.
   */
  private normalizeFetchError(
    error: unknown,
    method: HttpMethod,
    url: string,
    timeout: number,
    ownController: AbortSignal,
    externalSignal: AbortSignal | undefined,
  ): HttpError {
    let httpError: HttpError;

    if (error instanceof DOMException && error.name === "AbortError") {
      if (ownController.aborted) {
        httpError = makeHttpError(
          `Tempo limite excedido (${timeout}ms) ao chamar ${method} ${url}`,
          { isTimeoutError: true, url },
        );
        httpError.name = "RequestTimeoutError";
      } else {
        // abortado pelo signal externo do caller, não pelo nosso timeout
        httpError = makeHttpError("Requisição cancelada", {
          isCancelledError: true,
          url,
        });
        httpError.name = "RequestCancelledError";
      }
      httpError.cause = error;
      void externalSignal; // documenta a intenção; a checagem real é ownController.aborted
    } else if (error instanceof TypeError) {
      httpError = makeHttpError(
        "Erro de conexão: verifique sua internet ou tente novamente mais tarde",
        { isNetworkError: true, url },
      );
      httpError.name = "NetworkError";
      httpError.cause = error;
    } else {
      httpError =
        error instanceof Error
          ? (error as HttpError)
          : makeHttpError(String(error), { url });
    }

    void this.config.onError?.({ url, error: httpError });
    return httpError;
  }

  /**
   * parseResponse is a private method that processes the response from an HTTP request based on the specified response type. It handles different response types such as JSON, text, blob, and arrayBuffer, and also automatically determines the response type based on the Content-Type header if the responseType is set to "auto". If the response status is 204 (No Content), it returns an empty object.
   * @param response - the Response object from the HTTP request, which contains the status code, headers, and response body.
   * @param responseType - the expected response type, which can be "auto", "json", "text", "blob", or "arrayBuffer". If set to "auto", the method will determine the response type based on the Content-Type header of the response.
   * @returns returns a Promise that resolves to the parsed response data, which can be of type T, an empty object, a string, a Blob, or an ArrayBuffer, depending on the specified response type and the actual response content.
   */
  private async parseResponse<T>(
    response: Response,
    responseType: ResponseType,
  ): Promise<T | Record<string, never> | string | Blob | ArrayBuffer> {
    if (response.status === 204) return {};

    if (responseType === "blob") return response.blob();
    if (responseType === "arrayBuffer") return response.arrayBuffer();
    if (responseType === "text") return response.text();
    if (responseType === "json") return response.json() as Promise<T>;

    // auto: decide pelo content-type
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json"))
      return response.json() as Promise<T>;
    if (contentType.startsWith("text/")) return response.text();
    if (contentType) return response.blob();
    return response.text();
  }
}

/**
 * createHttpClient is a factory function that creates an instance of the HttpClient class with the provided configuration. It allows for easy instantiation of the HttpClient with custom settings such as base URL, default headers, authentication, CSRF protection, and retry options.
 * @param config - an optional HttpClientConfig object for configuring the HttpClient instance. If not provided, default settings will be used.
 * @returns returns an instance of the HttpClient class that can be used to make HTTP requests with the specified configuration.
 */
export function createHttpClient(config: HttpClientConfig = {}): HttpClient {
  return new HttpClient(config);
}

export { createInMemoryCsrfAdapter };
