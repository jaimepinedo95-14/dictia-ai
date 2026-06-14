import { useState, useEffect } from 'react'
import { X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STORAGE_KEY = 'dictia_pwa_banner_dismissed'

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOS, setShowIOS] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Already installed or user dismissed
    if (isInStandaloneMode()) return
    if (localStorage.getItem(STORAGE_KEY)) return

    if (isIOS()) {
      setShowIOS(true)
      setVisible(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    }
    setDeferredPrompt(null)
  }

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary-600 text-white px-4 py-2.5 flex items-center gap-3 shadow-lg">
      <Smartphone size={18} className="flex-shrink-0 opacity-90" />
      <p className="flex-1 text-sm font-medium leading-tight">
        {showIOS
          ? <>📱 Instala Dictia: toca <strong>Compartir</strong> → <strong>Agregar a pantalla de inicio</ strong></>
          : '📱 Instala Dictia en tu celular para grabar desde cualquier lugar'
        }
      </p>
      {!showIOS && (
        <button
          onClick={install}
          className="text-xs font-bold bg-white text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors flex-shrink-0"
        >
          Instalar
        </button>
      )}
      <button
        onClick={dismiss}
        className="p-1 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
        aria-label="Cerrar"
      >
        <X size={16} />
      </button>
    </div>
  )
}
