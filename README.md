![NextJWTAuth Logo](assets/next-jwt-auth-logo.png)

# Next JWT Auth

## The problem

In many application the frontend and backend are two separate application. Your JWT authentication service may be written in different language/framework and hosted somewhere else. You just want to call the auth service APIs from your NextJS app and manage JWT tokens.

Official NextJS auth library creates authentication API endpoints inside the Next application. That means there is an extra hop between your frontend and auth service.

Moreover, refresh token management is a pain in Next Auth library, there is just too much boilerplate code.

And lastly, Next Auth library is too much for a simple JWT authentication, it provides Social login. Many apps don't require social login. Many apps just want to implement JWT token without pain.

## The solution

This library calls your own JWT auth APIs directly from frontend (skipping your NextJS backend hop) and manages JWT tokens in browser cookies. It will store both your access and refresh token and will refresh your access token automatically when the access token is expired.

This library will also automatically logout users when the refresh token also get expired.

## Dependecies

You need to use `React >=16`. `NextJS` and `Axios` are the two peer dependencies. You need install `next^14.1.4` and `axios^1.6.8` first.

```
npm i next axios

npm i next-jwt-auth
```

## Usage

Let's assume a Login API which will take email/password in the request body and will give the following response,

```
endpoint: https://awesome-api-service.com/auth/signin
method: POST
```

**body:**

```json
{
  "email": "customer@awesome.com",
  "password": "123456"
}
```

**response:**

```json
{
  "user": {
    "id": "65d9ce7cefae2dd3c4da3e19",
    "email": "customer@awesome.com",
    "phone": "01611223344",
    "firstName": "Mr.",
    "lastName": "Customer",
    "type": "Customer",
    "active": true,
    "verified": true,
    "lock": {
      "isLocked": false,
      "loginAttempts": 0
    }
  },
  "access": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZDljZTdjZWZhZTJkZDNjNGRhM2UxOSIsInR5cGUiOiJDdXN0b21lciIsImFjdGl2ZSI6dHJ1ZSwidmVyaWZpZWQiOnRydWUsImxvY2siOnsiaXNMb2NrZWQiOmZhbHNlLCJsb2dpbkF0dGVtcHRzIjowfSwiaWF0IjoxNzEyMTAwNjU0LCJleHAiOjE3MTIxMDA5NTR9.O80rJIkxEk2uCfviRvQPJwts5H8u-qRRPBCbjqX_oOk",
    "expiresAt": "2024-04-02T23:35:54.624Z"
  },
  "refresh": {
    "token": "AGrhx3aif0jZLZ3/8gsjbLpjqeFr+CDtkf+qrL1ErdZwufuYSNFUu4i5WsYO4MT+YeWHmM8A2lJa7bbSDeMwkg==",
    "expiresAt": "2024-04-03T00:00:54.625Z"
  }
}
```

Now, let's come to the library configuration.  
Create a typescript file `src/types/Auth.ts` (it can be anywhere of your choice) for your `User` type,

```ts
import { AuthUser } from 'next-jwt-auth'

export interface LoggedInUser extends AuthUser {
  // the id: string | number property will come from AuthUser type
  email: string
  firstName: string
  lastName: string
  phone: string
  type: 'Super Admin' | 'Admin' | 'Customer'
  active: boolean
  verified: boolean
  photo?: string
  lock?: {
    isLocked: boolean
    loginAttempts: number
    feedback?: string
    lockedAt?: string
  }
}
```

After that, create another file in `src/config/Auth.ts` (again, it can be any file of your choice) and put the following configuration,

```ts
import { JWTAuthConfig, createJWTAuthProvider } from 'next-jwt-auth'
import { useContext } from 'react'
import { LoggedInUser } from '../types/Auth'

export const authConfig: JWTAuthConfig = {
  apiBaseUrl: 'https://awesome-api-service.com', // or, process.env.NEXT_PUBLIC_API_BASE_URL!
  user: {
    /**
     * This is the property name in the response
     * where your user object is located
     */
    property: 'user',
  },
  accessToken: {
    /**
     * This is the property name in the response
     * where your access token string is located
     */
    property: 'access.token',
    /**
     * Access token Expiry time is optional.
     * If no expiry time found, then access token
     * will automatically expire when there is an
     * Unathorized response (http status code 401) found
     * from your API service
     */
    expireTimeProperty: 'access.expiresAt', // optional
  },
  /**
   * Refresh token configuration is optional.
   * You can skip it if your backend API only gives access token in login response.
   * If refresh token configuration is undefined then
   * this library won't try to call refresh token API
   * and will automatically logout the user once the access token is expired
   */
  refreshToken: {
    /**
     * This is the property name in the response
     * where your access token string is located
     */
    property: 'refresh.token',
    /**
     * Refresh token Expiry time is optional.
     * If no expiry time found, then refresh token
     * will automatically expire when the library
     * can't get a new access token using the refresh token anymore
     */
    expireTimeProperty: 'refresh.expiresAt', // optional
  },
  /**
   * Here are the API endpoints that your custom Auth service exposes
   */
  endpoints: {
    login: { url: '/auth/signin', method: 'post' },
    logout: { url: '/auth/signout', method: 'post' },
    /**
     * (Optional)
     * You can skip 'refresh' property if your backend has no token refreshing mechanism
     */
    refresh: { url: '/auth/refresh-token', method: 'post' },
    /**
     * (Optional)
     * You can skip 'refresh' property if your backend has no user profile fetch API
     */
    user: { url: '/auth/profile', method: 'get' },
  },
  /**
   * This is the NextJS route for your login page.
   * This library will automatically redirect
   * user to this page when user session is expired.
   *
   * i.e refresh token is also expired and user needs to login again
   */
  pages: {
    login: { url: '/login' },
  },

  /**
   * (Optional)
   * This is the HTTP status code which is returned by the server whenever the access token is expired
   * Default is: 401
   */
  unauthorizedStatusCode: 401,

  /**
   * (Optional)
   * User profile fetch API call interval in millisecond.
   * For example: If this interval is set to 5000,
   * then this library will call the user profile fetch API after every 5000 milliseconds.
   *
   * This API call will be used to determine if the access token is still valid.
   * If the access token is expired, then the server will return an unauthorized
   * response and this library will logout the user from the app.
   */
  userFetchIntervalMS: 1000,
}

/**
 * Next, we create the React Context and Context Provider
 * using our own User type.
 *
 * The reason why you need to create the context is because,
 * you need to tell the User type to the library.
 *
 * Otherwise the library cannot infer the User type
 * (will explain later below)
 */
export const { JWTAuthContext, JWTAuthProvider } = createJWTAuthProvider<LoggedInUser>()

/**
 * (Optional)
 * This is just a custom hook to easily access the JWTAuthContext.
 * You can skip this and use useContext(JWTAuthContext)
 * in your component, but this approach is more clean.
 */
export const useJWTAuthContext = () => {
  const context = useContext(JWTAuthContext)

  if (!context) {
    throw new Error('JWTAuthContext not found, please check the provider')
  }

  return context
}
```

Now, add the `JWTAuthProvider` in you React layout component (`src/components/layout/AppLayout.jsx`),

```jsx
'use client'

import { JWTAuthProvider, authConfig } from '../../config/Auth'

type AppLayoutProps = {
  children: React.ReactNode,
}

export default function AppLayout(props: AppLayoutProps) {
  return (
    <JWTAuthProvider config={authConfig}>
      <div>{props.children}</div>
    </JWTAuthProvider>
  )
}
```

You are ready to use the library in your login form component (`src/components/auth/LoginForm.jsx`)

```jsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useJWTAuthContext } from '../../config/Auth'

export default function LoginForm() {
  /**
   * Here you can use the custom hook
   * to access the library API easily
   */
  const { loginWithCredentials } = useJWTAuthContext()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const onSubmit = () => {
    try {
      setIsLoading(true) // show loading animation to user

      const isSuccess = await loginWithCredentials({
        email: values.email,
        password: values.password,
      })

      if (isSuccess) {
        router.push('/dashboard')
      }

    } catch (error: any) {
      console.log(error)
      // display error message to the user
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-2 w-full mx-auto">
        <EmailInputField .../>
        <PasswordInputField .../>
        <PrimaryActionButton
          label="Sign In"
          isLoading={isLoading}
          onClick={onSubmit}
        />
      </div>
    </div>
  )
}

```

Congratulations ! now you have a working login page. Now we need to access the currently logged in user information from the library. Let's assume we are displaying the user information in a `Profile` component. (`src/components/user/Profile.jsx`)

```jsx
import { useJWTAuthContext } from '../../config/Auth'

export default function Profile() {
  /**
   * This 'user' object has the type of `LoggedInUser`
   * which we defined in the src/config/Auth.ts file
   *
   * We used the factory pattern
   * (createcreateJWTAuthProvider<LoggedInUser>()) to solve this problem.
   *
   * Without the factory pattern our 'user' object
   * will have the type of 'AuthUser'
   * which have only {id: string} in it.
   */
  const { user } = useJWTAuthContext()

  if (!user) {
    /**
     * User can be null. For example,
     * after logout we don't have any user object
     */
    return null
  }

  return (
    <div className="font-medium text-neutral text-sm">
      <span>{user.firstName}</span>
      <span>{user.lastName}</span>
    </div>
  )
}
```

Finally, for logout button, (`src/components/auth/LogoutButton.jsx`)

```jsx
'use client'

import { useJWTAuthContext } from '../../config/Auth'

/**
 * User will be automatically redirected to 'login' page
 * (configured in src/config/Auth.ts) after logout
 */
export default function LogOutButton() {
  const { logout } = useJWTAuthContext()

  return (
    <button onClick={() => logout()}>
      <span>LogOut</span>
    </button>
  )
}
```

**One important Note:**  
You should use the axios client from this library to call your APIs, otherwise this library won't detect when your access token gets rejected by your API server.

When you use the axios client from this library, the client will automatically add 'Authorization' header to your requests. It will also detect when your JWT token expires and will call your Refresh Token API to get a new Authorization token.

For example, let's say you have a custom hook that uses [react-query](https://github.com/TanStack/query) to make a request to your API service, you can use the axios client from this library to make the request like below,

```ts
import { useQuery } from '@tanstack/react-query'
import { useJWTAuthContext } from '../../config/Auth'

type EmployeeListFetchParams = {
  page: number
  limit: number
  search: string
}

type EmployeeItem = {
  id: number
  name: string
  email: string
}

export const useEmployeeListFetchAPI = (params: EmployeeListFetchParams) => {
  const { apiClient } = useJWTAuthContext()

  return useQuery({
    queryKey: ['employee-list', params],
    async queryFn() {
      const endpoint = `/user/employee-list`
      const { data } = await apiClient().get<EmployeeItem[]>(endpoint, {
        params,
      })

      return data
    },
  })
}
```

> The above `apiClient()` will use the same `apiBaseUrl` that you defined in `src/config/Auth.ts`. If you have different API base URL then just add the full URL to the above `endpoint` variable (example: `const endpoint = 'https://my.another-api-service.com/user/employee-list'`)

**Next Auth Middleware**

You can use the `isAuthenticatedRequest()` method to check if the user is authenticated on the Next.js Server side. Here is a sample middleware:

```ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isAuthenticatedRequest } from 'next-jwt-auth'

const publicRoutes = ['/', '/login', '/signup', '/reset', '/success', '/verify']

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const isUnprotectedRoute = publicRoutes.includes(request.nextUrl.pathname)

  if (!isUnprotectedRoute && !isAuthenticatedRequest(request)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```
