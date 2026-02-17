// lib/i18n/get-date-fns-locale.ts
// Maps Flatro app locales to date-fns locale objects.
// Usage: import { getDateFnsLocale } from '@/lib/i18n/get-date-fns-locale'

import { ru } from 'date-fns/locale/ru'
import { pl } from 'date-fns/locale/pl'
import { enUS } from 'date-fns/locale/en-US'
import { de } from 'date-fns/locale/de'
import { uk } from 'date-fns/locale/uk'
import { cs } from 'date-fns/locale/cs'
import type { Locale as DateFnsLocale } from 'date-fns'
import type { Locale } from './dictionaries'

const dateFnsLocaleMap: Record<Locale, DateFnsLocale> = {
  ru,
  pl,
  en: enUS,
  de,
  uk,
  cs,
}

/**
 * Returns the date-fns Locale object for the given app locale.
 * Falls back to `ru` if not found.
 */
export function getDateFnsLocale(locale: Locale): DateFnsLocale {
  return dateFnsLocaleMap[locale] ?? ru
}