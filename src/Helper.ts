import { NextRequest } from 'next/server'
import { CookiePaths } from './JWTAuthContext'

export const getPropByKeyPath = <T>(
  object: Record<string, any>,
  keys: string[] | string,
  defaultVal: T | null = null
): T | null => {
  keys = Array.isArray(keys) ? keys : keys.split('.')
  object = object[keys[0]]
  if (object && keys.length > 1) {
    return getPropByKeyPath(object, keys.slice(1), defaultVal)
  }
  return (object === undefined ? defaultVal : object) as T | null
}

type AuthenticatedRequestCheckOptions = {
  checkForRefreshToken?: boolean
  cookiePaths: CookiePaths
}

export const isAuthenticatedRequest = (req: NextRequest, options?: AuthenticatedRequestCheckOptions) => {
  const defaultOptions: Required<AuthenticatedRequestCheckOptions> = {
    checkForRefreshToken: false,
    cookiePaths: options?.cookiePaths ?? {
      authUser: 'authUser',
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
    },
  }
  const shouldCheckForRefreshToken = options?.checkForRefreshToken ?? defaultOptions.checkForRefreshToken

  const cookies = req.cookies
  const accessToken = cookies.get(defaultOptions.cookiePaths.accessToken)
  const refreshToken = cookies.get(defaultOptions.cookiePaths.refreshToken)

  if (shouldCheckForRefreshToken) {
    return !!accessToken && !!refreshToken
  }

  return !!accessToken
}
