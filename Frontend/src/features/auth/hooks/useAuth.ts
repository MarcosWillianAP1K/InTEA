import { useCallback, useState } from "react";

interface AuthState {
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    loading: false,
    error: null,
  });

  /** Login
   * @param data - object with a login request data
   * @returns Promise com a resposta do login (dados de autenticação, tokens etc.)
   * @throws Lança o erro capturado caso a requisição de login falhe
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
