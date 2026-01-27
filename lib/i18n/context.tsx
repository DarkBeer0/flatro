// src/lib/i18n/context.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, Dictionary, getDictionary, locales } from './dictionaries'

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Dictionary
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ru')
  const [dictionary, setDictionary] = useState<Dictionary>(getDictionary('ru'))

  useEffect(() => {
    const savedLocale = localStorage.getItem('flatro-locale') as Locale
    if (savedLocale && locales.includes(savedLocale)) {
      setLocaleState(savedLocale)
      setDictionary(getDictionary(savedLocale))
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    setDictionary(getDictionary(newLocale))
    localStorage.setItem('flatro-locale', newLocale)
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: dictionary }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}
