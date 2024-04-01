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
  refreshToken: TokenPropertyDescriptor
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
}

export interface AuthUser {
  id: number
}

export type TokenData = {
  token: string
  expiresAt: string
}

export type JWTAuthContextValue = {
  controller: JWTAuthController
  isLoggedIn: boolean | null
  user: AuthUser | null
  apiClient: () => AxiosInstance
  loginWithCredentials: (data: Record<string, any>) => Promise<boolean>
  loginWithResponse: (data: Record<string, any>) => Promise<boolean>
  logout: (data?: Record<string, any>) => Promise<boolean>
  fetchUser: () => Promise<void>
  onRefreshToken: () => Promise<void>
  onError: (error: any) => void
}

export const JWTAuthContext = createContext<JWTAuthContextValue | undefined>(undefined)
