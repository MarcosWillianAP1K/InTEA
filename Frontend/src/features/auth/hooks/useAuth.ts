import { useCallback, useState } from "react";

interface AuthState {
  loading: boolean;
  error: string | null;
}

/**
 * Custom React hook managing user authentication state, credentials login, and session persistence.
 *
 * @returns Authentication controls and state observers.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    loading: false,
    error: null,
  });

  /**
   * Authenticates user credentials against the API and initializes the session.
   *
   * @param username - User identifier or email address.
   * @param password - Account password.
   * @returns Resolves when authentication succeeds.
   * @throws {Error} If authentication fails or network error occurs.
   */
  const login = useCallback(async (username: string, password: string) => {
    try {
      // setState({ loading: true, error: null });
      // const response = await AuthService.login(data);
      // if (response.data) {
      //   const fullProfile = await ProfileService.getProfile(
      //     response.data.accessToken,
      //   );
      //   useAuthStore.getState().setSession({
      //     user: fullProfile,
      //     accessToken: response.data.accessToken,
      //     refreshToken: response.data.refreshToken,
      //   });
      // }
      // setState({ loading: false, error: null });
      // return response;
    } catch (error: any) {
      // setState({
      //   loading: false,
      //   error: error?.message ?? "Erro ao fazer login",
      // });
      throw error;
    }
  }, []);

  /**Only one return for all callback, because the useCallback memoryze the funtion in others words only one call for tem service */
  return {};
}
