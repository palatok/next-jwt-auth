import { createContext } from 'react'
import { JWTAuthController } from './JWTAuthController'
import { AxiosInstance } from 'axios'

type APIEndpoint = {
  url: string
  method: 'get' | 'post'
}

type AppEndpoint = Pick<APIEndpoint, 'url'>

type ResponsePropertyDescriptor = {
  property: string
}

type TokenPropertyDescriptor = ResponsePropertyDescriptor & {
  expireTimeProperty?: string
}

export type JWTAuthConfig = {
  apiBaseUrl: string
  accessToken: TokenPropertyDescriptor
  refreshToken?: TokenPropertyDescriptor
  user: ResponsePropertyDescriptor
  endpoints: {
    login: APIEndpoint
    logout: APIEndpoint
    refresh: APIEndpoint
    user: APIEndpoint
  }
  pages: {
    login: AppEndpoint
  }
  unauthorizedStatusCode?: number
}

export interface AuthUser {
  id: number | string
}

export type TokenData = {
  token: string
  expiresAt: string
}

export type JWTAuthContextValue<UserProps extends AuthUser = AuthUser> = {
  controller: JWTAuthController
  isLoggedIn: boolean | null
  user: UserProps | null
  apiClient: () => AxiosInstance
  loginWithCredentials: (data: Record<string, any>) => Promise<boolean>
  loginWithResponse: (data: Record<string, any>) => Promise<boolean>
  logout: (data?: Record<string, any>) => Promise<boolean>
  fetchUser: () => Promise<void>
  onRefreshToken: () => Promise<void>
  onError: (error: any) => void
}

export const createJWTAuthContext = <UserProps extends AuthUser>() =>
  createContext<JWTAuthContextValue<UserProps> | undefined>(undefined)
