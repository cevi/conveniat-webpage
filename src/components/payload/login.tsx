'use client'
import React from 'react'
import { signIn } from 'next-auth/react'

const LoginButton = () => {
  return (
    <button onClick={() => signIn('cevi-db')}>Login with CeviDB</button>
  )
}


export default LoginButton