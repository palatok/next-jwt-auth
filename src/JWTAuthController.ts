import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import Cookies from "js-cookie";
import { getPropByKeyPath } from "./Helper";
import { AuthUser, JWTAuthConfig } from "./JWTAuthContext";

export const cookiePaths = {
  AUTH_USER: "auth.user",
  ACCESS_TOKEN: "auth.access_token",
  REFRESH_TOKEN: "auth.refresh_token",
} as const;

export type LoginResponse<T extends AuthUser> = {
  user: T;
  accessToken: string;
  refreshToken: string;
};

export class JWTAuthController {
  private httpClient: AxiosInstance;
  private isLoading: boolean = false;

  constructor(private config: JWTAuthConfig) {
    this.httpClient = axios.create({
      baseURL: this.config.apiBaseUrl,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    this.httpClient.interceptors.request.use(
      this.onRequestProcess.bind(this),
      (error) => Promise.reject(error)
    );
    this.httpClient.interceptors.response.use(
      (response) => response,
      this.onResponseError.bind(this)
    );
  }

  getHttpClient() {
    return this.httpClient;
  }

  getAccessToken() {
    return Cookies.get(cookiePaths.ACCESS_TOKEN);
  }

  getRefreshToken() {
    return Cookies.get(cookiePaths.REFRESH_TOKEN);
  }

  isAuthStateLoading() {
    return this.isLoading;
  }

  setAuthStateLoading(flag: boolean) {
    this.isLoading = flag;
  }

  onRequestProcess(config: InternalAxiosRequestConfig<any>) {
    if (config.url !== this.config.endpoints.login.url) {
      // Not login request, so add access token to header

      const accessToken = this.getAccessToken();
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  }

  async onResponseError(error: any) {
    if (error.response.status === 401) {
      try {
        const { accessToken } = await this.refreshAccessToken();

        const requestConfig = error.config;
        requestConfig.headers.Authorization = `Bearer ${accessToken}`;
        return this.httpClient(requestConfig);
      } catch (error) {
        this.onLogoutRequestComplete();
      }
    }

    return Promise.reject(error);
  }

  async loginWithUsernamePassword<T extends AuthUser>(
    data: Record<string, any>
  ): Promise<T> {
    this.setAuthStateLoading(true);

    const url = this.config.endpoints.login.url;
    let response: AxiosResponse<Record<string, any>, any> | null = null;

    if (this.config.endpoints.login.method === "post") {
      response = await this.httpClient.post<Record<string, any>>(url, data);
    } else {
      response = await this.httpClient.get<Record<string, any>>(url, {
        params: data,
      });
    }

    if (!response) {
      throw new Error("Request failed with no response");
    }

    if (response.status !== 200) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return this.onLoginRequestComplete<T>(response.data);
  }

  onLoginRequestComplete = <T extends AuthUser>(
    response: Record<string, any>
  ): T => {
    const user = getPropByKeyPath<T>(response, this.config.user.property);

    if (!user) {
      throw new Error("Unexpected response from API, please recheck");
    }

    Cookies.set(cookiePaths.AUTH_USER, JSON.stringify(user));

    this.onTokenPairUpdated(response);

    return user;
  };

  onTokenPairUpdated(response: Record<string, any>) {
    const accessToken = getPropByKeyPath<string>(
      response,
      this.config.accessToken.property
    );
    const accessTokenExpiresAt: string | null = this.config.accessToken
      .expireTimeProperty
      ? getPropByKeyPath(response, this.config.accessToken.expireTimeProperty)
      : null;

    const refreshToken = getPropByKeyPath<string>(
      response,
      this.config.refreshToken.property
    );
    const refreshTokenExpiresAt: string | null = this.config.refreshToken
      .expireTimeProperty
      ? getPropByKeyPath(response, this.config.refreshToken.expireTimeProperty)
      : null;

    if (!accessToken || !refreshToken) {
      console.log(
        "token pair not found:: ",
        response,
        accessToken,
        refreshToken
      );

      throw new Error("Token not found in response");
    }

    Cookies.set(cookiePaths.ACCESS_TOKEN, accessToken, {
      expires: accessTokenExpiresAt
        ? new Date(accessTokenExpiresAt)
        : undefined,
    });
    Cookies.set(cookiePaths.REFRESH_TOKEN, refreshToken, {
      expires: refreshTokenExpiresAt
        ? new Date(refreshTokenExpiresAt)
        : undefined,
    });

    return { accessToken, refreshToken };
  }

  async logoutFromApp(data: Record<string, any>) {
    this.setAuthStateLoading(true);

    if (this.config.endpoints.logout.url) {
      const url = this.config.apiBaseUrl + this.config.endpoints.logout.url;
      let response: AxiosResponse<Record<string, any>, any> | null = null;

      if (this.config.endpoints.login.method === "post") {
        response = await this.httpClient.post<Record<string, any>>(url, data);
      } else {
        response = await this.httpClient.get<Record<string, any>>(url, {
          params: data,
        });
      }

      if (!response) {
        throw new Error("Request failed with no response");
      }

      if (response.status !== 200) {
        throw new Error(`Request failed with status ${response.status}`);
      }
    }

    this.onLogoutRequestComplete();

    return true;
  }

  onLogoutRequestComplete() {
    Cookies.remove(cookiePaths.AUTH_USER);
    Cookies.remove(cookiePaths.ACCESS_TOKEN);
    Cookies.remove(cookiePaths.REFRESH_TOKEN);
  }

  async fetchUserProfile<T extends AuthUser>() {
    this.setAuthStateLoading(true);

    const url = this.config.endpoints.user.url;
    let response: AxiosResponse<
      Record<string, any>,
      any
    > = await this.httpClient({
      url,
      method: this.config.endpoints.user.method,
    });

    if (response.status !== 200) {
      throw new Error("User profile fetch API failed");
    }

    return getPropByKeyPath<T>(response.data, this.config.user.property);
  }

  async refreshAccessToken() {
    this.setAuthStateLoading(true);

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error("Refresh token not found");
    }

    const url = this.config.endpoints.refresh.url;
    let response: AxiosResponse<Record<string, any>, any> | null = null;

    if (this.config.endpoints.refresh.method === "post") {
      response = await this.httpClient.post<Record<string, any>>(url, {
        refreshToken,
      });
    } else {
      response = await this.httpClient.get<Record<string, any>>(url, {
        params: { refreshToken },
      });
    }

    if (!response) {
      throw new Error("Request failed with no response");
    }

    if (response.status !== 200) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return this.onTokenPairUpdated(response.data);
  }
}
