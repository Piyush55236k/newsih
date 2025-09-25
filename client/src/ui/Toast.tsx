import React, { useEffect, useState } from 'react'

export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export function showToast(message: string, kind: ToastKind = 'info', timeout = 3000) {
  window.dispatchEvent(new CustomEvent('toast:show', { detail: { message, kind, timeout } }))
}

export function ToastHost() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; kind: ToastKind }>>([])

  useEffect(() => {
    let idCounter = 1
    const onShow = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string; kind: ToastKind; timeout?: number }
      const id = idCounter++
      setToasts((t) => [...t, { id, message: detail.message, kind: detail.kind || 'info' }])
      const to = window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), detail.timeout ?? 3000)
      return () => clearTimeout(to)
    }
    window.addEventListener('toast:show', onShow as any)
    return () => window.removeEventListener('toast:show', onShow as any)
  }, [])

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
