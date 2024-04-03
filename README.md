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

## Configuration

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
Create a typescript file for your `User` type, create a typescript file `src/types/Auth.ts` (it can be anywhere of your choice),

```ts
import { AuthUser } from "next-jwt-auth";

export interface LoggedInUser extends AuthUser {
  // the id: string property will come from AuthUser type
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  type: "Super Admin" | "Admin" | "Customer";
  active: boolean;
  verified: boolean;
  photo?: string;
  lock?: {
    isLocked: boolean;
    loginAttempts: number;
    feedback?: string;
    lockedAt?: string;
  };
}
```

After that, create another file in `src/config/Auth.ts` (again, it can be any file of your choice) and put the following configuration,

```ts
import { JWTAuthConfig, createJWTAuthProvider } from "next-jwt-auth";
import { useContext } from "react";
import { LoggedInUser } from "../types/Auth";

export const authConfig: JWTAuthConfig = {
  apiBaseUrl: "https://awesome-api-service.com", // or, process.env.API_BASE_URL!
  user: {
    /**
     * This is the property name in the response
     * where your user object is located
     */
    property: "user",
  },
  accessToken: {
    /**
     * This is the property name in the response
     * where your access token string is located
     */
    property: "access.token",
    /**
     * Access token Expiry time is optional.
     * If no expiry time found, then access token
     * will automatically expire when there is an
     * Unathorized response (http status code 401) found
     * from your API service
     */
    expireTimeProperty: "access.expiresAt", // optional
  },
  refreshToken: {
    /**
     * This is the property name in the response
     * where your access token string is located
     */
    property: "refresh.token",
    /**
     * Refresh token Expiry time is optional.
     * If no expiry time found, then refresh token
     * will automatically expire when the library
     * can't get a new access token using the refresh token anymore
     */
    expireTimeProperty: "refresh.expiresAt", // optional
  },
  /**
   * Here are the API endpoints that your custom Auth service exposes
   */
  endpoints: {
    login: { url: "/auth/signin", method: "post" },
    logout: { url: "/auth/signout", method: "post" },
    refresh: { url: "/auth/refresh-token", method: "post" },
    user: { url: "/auth/profile", method: "get" },
  },
  /**
   * This is the NextJS route for your login page.
   * This library will automatically redirect
   * user to this page when user session is expired.
   *
   * i.e refresh token is also expired and user needs to login again
   */
  pages: {
    login: { url: "/login" },
  },
};

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
export const { JWTAuthContext, JWTAuthProvider } =
  createJWTAuthProvider<LoggedInUser>();

/**
 * (Optional)
 * This is just a custom hook to easily access the JWTAuthContext.
 * You can skip this and use useContext(JWTAuthContext)
 * in your component, but this approach is more clean.
 */
export const useJWTAuthContext = () => {
  const context = useContext(JWTAuthContext);

  if (!context) {
    throw new Error("JWTAuthContext not found, please check the provider");
  }

  return context;
};
```

Now, add the `JWTAuthProvider` in you React layout component (`src/components/layout/AppLayout.jsx`),

```jsx
"use client";

import { JWTAuthProvider, authConfig } from "../../config/Auth";

type AppLayoutProps = {
  children: React.ReactNode,
};

export default function AppLayout(props: AppLayoutProps) {
  return (
    <JWTAuthProvider config={authConfig}>
      <div>{props.children}</div>
    </JWTAuthProvider>
  );
}
```

Now, use the library in your login form component (`src/components/auth/LoginForm.jsx`)

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
      </form>
    </div>
  )
}

```

Congratulations, now you have a working login page. Now we need to access the currently logged in user information from the library. Let's assume we are displaying the user information in a `Profile` component. (`src/components/user/Profile.jsx`)

```jsx
import { useJWTAuthContext } from "../../config/Auth";

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
  const { user } = useJWTAuthContext();

  if (!user) {
    /**
     * User can be null. For example,
     * after logout we don't have any user object
     */
    return null;
  }

  return (
    <div className="font-medium text-neutral text-sm">
      <span>{user.firstName}</span>
      <span>{user.lastName}</span>
    </div>
  );
}
```

Finally, for logout button, (`src/components/auth/LogoutButton.jsx`)

```jsx
"use client";

import { useJWTAuthContext } from "../../config/Auth";

/**
 * User will be automatically redirected to 'login' page
 * (configured in src/config/Auth.ts) after logout
 */
export default function LogOutButton() {
  const { logout } = useJWTAuthContext();

  return (
    <button onClick={() => logout()}>
      <span>LogOut</span>
    </button>
  );
}
```

**One important Note:**  
You should use the axios client from this library to call your APIs, otherwise this library won't detect when your access token gets rejected by your API server. For example, in any file/component where you want to execute your API calls, do this

```ts
import { authConfig } from "@/config/Auth";
import { JWTAuthController } from "next-jwt-auth";

const controller = new JWTAuthController(authConfig);

const response = await controller.getHttpClient().get("<your API endpoint>");
```

Apology for the above `controller.getHttpClient()` pattern (I don't like it either), I will try to give more elegant and easy solution in the future releases.
