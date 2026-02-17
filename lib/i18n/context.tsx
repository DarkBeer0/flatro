// lib/i18n/context.tsx
// UPDATED: Now dynamically updates <html lang="..."> and document.title
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, Dictionary, getDictionary, locales } from './dictionaries'

// Maps our app locale codes to BCP-47 lang tags
const htmlLangMap: Record<Locale, string> = {
  ru: 'ru',
  pl: 'pl',
  en: 'en',
  de: 'de',
  uk: 'uk',   // Ukrainian = 'uk' in BCP-47
  cs: 'cs',
}

// Locale-aware metadata (title & description)
const metadataMap: Record<Locale, { title: string; description: string }> = {
  ru: { title: 'Flatro — Управление арендой', description: 'Приложение для управления арендой недвижимости' },
  pl: { title: 'Flatro — Zarządzanie wynajmem', description: 'Aplikacja do zarządzania wynajmem nieruchomości' },
  en: { title: 'Flatro — Rental Management', description: 'Rental property management application' },
  de: { title: 'Flatro — Mietverwaltung', description: 'Anwendung zur Verwaltung von Mietobjekten' },
  uk: { title: 'Flatro — Управління орендою', description: 'Додаток для управління орендою нерухомості' },
  cs: { title: 'Flatro — Správa pronájmu', description: 'Aplikace pro správu pronájmu nemovitostí' },
}

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Dictionary
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ru')
  const [dictionary, setDictionary] = useState<Dictionary>(getDictionary('ru'))

  // On mount: read saved locale
  useEffect(() => {
    const savedLocale = localStorage.getItem('flatro-locale') as Locale
    if (savedLocale && locales.includes(savedLocale)) {
      setLocaleState(savedLocale)
      setDictionary(getDictionary(savedLocale))
      applyLocaleToDocument(savedLocale)
    } else {
      applyLocaleToDocument('ru')
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    setDictionary(getDictionary(newLocale))
    localStorage.setItem('flatro-locale', newLocale)
    applyLocaleToDocument(newLocale)
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: dictionary }}>
      {children}
    </LocaleContext.Provider>
  )
}

/** Updates <html lang> and <title> to match the active locale */
function applyLocaleToDocument(locale: Locale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = htmlLangMap[locale] || 'ru'
  const meta = metadataMap[locale] || metadataMap.ru
  document.title = meta.title
  // Update meta description if present
  const descTag = document.querySelector('meta[name="description"]')
  if (descTag) {
    descTag.setAttribute('content', meta.description)
  }
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}