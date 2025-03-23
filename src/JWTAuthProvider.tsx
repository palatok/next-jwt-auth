import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { AuthUser, JWTAuthConfig, createJWTAuthContext } from './JWTAuthContext'
import { JWTAuthController } from './JWTAuthController'

type JWTAuthProviderType = {
  children: React.ReactNode
  config: JWTAuthConfig
}

export function createJWTAuthProvider<UserProps extends AuthUser = AuthUser>() {
  const JWTAuthContext = createJWTAuthContext<UserProps>()

  const JWTAuthProvider: React.FC<JWTAuthProviderType> = (props: JWTAuthProviderType) => {
    const router = useRouter()
    const controller = new JWTAuthController(props.config)

    const [isLoggedIn, setLoggedIn] = useState<boolean | null>(null)
    const [user, setUser] = useState<UserProps | null>(null)

    const apiClient = () => controller.getHttpClient()

    const navigateToLoginPage = () => router.push(props.config.pages.login.url)

    const onError = (error: any) => {
      controller.onLogoutRequestComplete()
      controller.setAuthStateLoading(false)

      setUser(null)
      setLoggedIn(false)
      navigateToLoginPage()

      console.log('Next JWT auth error: ', error)
    }

    const loginWithCredentials = async (data: Record<string, any>): Promise<boolean> => {
      try {
        const user = await controller.loginWithUsernamePassword<UserProps>(data)
        controller.setAuthStateLoading(false)

        setUser(user)
        setLoggedIn(true)
        return true
      } catch (error) {
        onError(error)
        throw error
      }
    }

    const loginWithResponse = async (data: Record<string, any>): Promise<boolean> => {
      try {
        const user = controller.onLoginRequestComplete<UserProps>(data)
        controller.setAuthStateLoading(false)

        setUser(user)
        setLoggedIn(true)
        return true
      } catch (error) {
        onError(error)
        throw error
      }
    }

    const logout = async (data: Record<string, any> = {}): Promise<boolean> => {
      try {
        await controller.logoutFromApp(data)
        controller.setAuthStateLoading(false)

        setUser(null)
        setLoggedIn(false)
        navigateToLoginPage()
        return true
      } catch (error) {
        onError(error)
        return false
      }
    }

    const fetchUser = async () => {
      if (props.config.endpoints.user === undefined || controller.getRefreshToken() === undefined) {
        return
      }

      try {
        const user = await controller.fetchUserProfile<UserProps>()
        controller.setAuthStateLoading(false)

        if (user) {
          console.log('fetched user', JSON.stringify(user))

          setUser(user)
          setLoggedIn(true)
        }
      } catch (error) {
        onError(error)
      }
    }

    const onRefreshToken = async () => {
      try {
        await controller.refreshAccessToken()
        controller.setAuthStateLoading(false)
      } catch (error) {
        onError(error)
      }
    }

    useEffect(() => {
      fetchUser()
    }, [])

    useEffect(() => {
      const interval = setInterval(() => {
        if (isLoggedIn !== true) {
          return
        }

        const accessToken = controller.getAccessToken()
        if (!accessToken && !controller.isAuthStateLoading()) {
          fetchUser()
        }
      }, props.config.userFetchIntervalMS ?? 1000)

      return () => clearInterval(interval)
    }, [isLoggedIn, user])

    return (
      <JWTAuthContext.Provider
        value={{
          user,
          logout,
          onError,
          apiClient,
          fetchUser,
          controller,
          isLoggedIn,
          onRefreshToken,
          loginWithResponse,
          loginWithCredentials,
        }}
      >
        {props.children}
      </JWTAuthContext.Provider>
    )
  }

  return { JWTAuthContext, JWTAuthProvider }
}
