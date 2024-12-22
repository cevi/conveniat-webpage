import type { TextField } from '@payloadcms/plugin-form-builder/types'

import React from 'react'

export const Text: React.FC<{} & TextField> = (
  { name, label }) => {
  return (
    <div>
      <label htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        type="text"
      />
    </div>
  )
}