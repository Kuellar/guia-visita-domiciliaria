import { useEffect, useRef } from 'react'

/**
 * Captcha de Cloudflare Turnstile (lo valida Supabase Auth al iniciar sesión).
 * Sin VITE_TURNSTILE_SITE_KEY no se muestra nada (desarrollo o captcha desactivado en Supabase).
 * Cada token sirve una sola vez: para pedir otro, vuelve a montar el componente (cambia su `key`).
 */

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
export const captchaEnabled = !!SITE_KEY

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string
  remove(id: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let loader: Promise<void> | null = null

function loadScript() {
  loader ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      loader = null
      reject(new Error('No se pudo cargar el captcha'))
    }
    document.head.appendChild(s)
  })
  return loader
}

export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!SITE_KEY) return
    let id: string | undefined
    let cancelled = false
    void loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return
      id = window.turnstile.render(ref.current, {
        sitekey: SITE_KEY,
        language: 'es',
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      })
    })
    return () => {
      cancelled = true
      if (id) window.turnstile?.remove(id)
    }
  }, [onToken])

  if (!SITE_KEY) return null
  return <div ref={ref} />
}
