'use client'
import React from 'react'
import { signIn } from 'next-auth/react'

const LoginButton = () => {
  const handleLoginClick = () => {
    signIn('cevi-db').catch((error) => {
      console.error('Login error', error)
    })
  }

  return <button onClick={handleLoginClick}>Login with CeviDB</button>
}

export default LoginButton
