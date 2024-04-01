import { useContext } from 'react'
import { JWTAuthContext } from './JWTAuthContext'

export const useJWTAuthContext = () => {
  const context = useContext(JWTAuthContext)

  if (!context) {
    throw new Error('useAuthContext must be used inside the JWTAuthProvider')
  }

  return context
}
