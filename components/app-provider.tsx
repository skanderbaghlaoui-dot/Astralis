'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { dictionaries, LANGS, type Dictionary, type Lang } from '@/lib/i18n'
import { zodiacContent } from '@/lib/zodiac-content'

const STORAGE_KEY = 'astralis-demo-state'
export const FREE_DAILY_AI = 0

type CheckoutState = 'closed' | 'upsell' | 'processing' | 'success'

type AppContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Dictionary
  z: (typeof zodiacContent)[Lang]
  isPremium: boolean
  setPremium: (value: boolean) => void
  aiRemaining: number
  consumeAi: () => boolean
  checkout: CheckoutState
  openUpsell: () => void
  startCheckout: () => void
  closeCheckout: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

const todayKey = () => new Date().toISOString().slice(0, 10)

type Persisted = {
  lang: Lang
  isPremium: boolean
  aiDate: string
  aiUsed: number
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es')
  const [isPremium, setPremiumState] = useState(false)
  const [aiUsage, setAiUsage] = useState({ date: todayKey(), used: 0 })
  const [checkout, setCheckout] = useState<CheckoutState>('closed')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Persisted>
        if (saved.lang && LANGS.includes(saved.lang)) setLangState(saved.lang)
        if (typeof saved.isPremium === 'boolean') setPremiumState(saved.isPremium)
        if (saved.aiDate === todayKey() && typeof saved.aiUsed === 'number') {
          setAiUsage({ date: saved.aiDate, used: saved.aiUsed })
        }
      }
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    const data: Persisted = {
      lang,
      isPremium,
      aiDate: aiUsage.date,
      aiUsed: aiUsage.used,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    document.documentElement.lang = lang
  }, [loaded, lang, isPremium, aiUsage])

  const usedToday = aiUsage.date === todayKey() ? aiUsage.used : 0
  const aiRemaining = isPremium
    ? Number.POSITIVE_INFINITY
    : Math.max(0, FREE_DAILY_AI - usedToday)

  const consumeAi = useCallback(() => {
    if (isPremium) return true
    if (aiRemaining <= 0) {
      setCheckout('upsell')
      return false
    }
    setAiUsage({ date: todayKey(), used: usedToday + 1 })
    return true
  }, [isPremium, aiRemaining, usedToday])

  const startCheckout = useCallback(() => {
    setCheckout('processing')
    // Pour lier Stripe plus tard, ajoutez ici la redirection vers votre lien de paiement :
    // window.location.href = "VOTRE_LIEN_STRIPE"
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      lang,
      setLang: setLangState,
      t: dictionaries[lang],
      z: zodiacContent[lang],
      isPremium,
      setPremium: setPremiumState,
      aiRemaining,
      consumeAi,
      checkout,
      openUpsell: () => setCheckout('upsell'),
      startCheckout,
      closeCheckout: () => setCheckout('closed'),
    }),
    [lang, isPremium, aiRemaining, consumeAi, checkout, startCheckout]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
  }

