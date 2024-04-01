import { NextRequest } from 'next/server'
import { cookiePaths } from './JWTAuthController'

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

export const isAuthenticatedRequest = (req: NextRequest) => {
  const cookies = req.cookies
  const accessToken = cookies.get(cookiePaths.ACCESS_TOKEN)
  const refreshToken = cookies.get(cookiePaths.REFRESH_TOKEN)

  return !!accessToken && !!refreshToken
}
