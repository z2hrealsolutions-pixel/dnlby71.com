import React from 'react'

export default function Footer({ variant = 'tv' }) {
  return (
    <div className={variant === 'tv' ? 'tv-footer' : 'phone-footer'}>
      Designed and Developed by Z2HxRealSolutions
    </div>
  )
}
