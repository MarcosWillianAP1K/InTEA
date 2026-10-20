export interface AuthState {
  loading: boolean;
  error: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expires_in: number;
}

export interface LoginResponse {
  data: AuthTokens;
  message: string;
}