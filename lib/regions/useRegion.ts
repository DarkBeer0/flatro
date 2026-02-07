/**
 * React хук для работы с регионами
 * 
 * Путь в проекте: lib/regions/useRegion.ts
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  RegionCode,
  RegionConfig,
  getRegion,
  getDefaultRegion,
  validateNationalId,
  validatePhone,
  formatPhone,
  normalizePhone
} from './config'

interface UseRegionReturn {
  // Текущий регион
  region: RegionConfig
  regionCode: RegionCode
  setRegionCode: (code: RegionCode) => void
  
  // Валидаторы
  validateNationalId: (id: string) => boolean
  validatePhone: (phone: string) => boolean
  
  // Форматтеры
  formatPhone: (phone: string) => string
  normalizePhone: (phone: string) => string
  
  // Хелперы для UI
  getPhonePlaceholder: () => string
  getNationalIdLabel: () => string
  getNationalIdPlaceholder: () => string
  getNationalIdDescription: () => string
  hasNationalId: () => boolean
  getCurrencySymbol: () => string
  formatCurrency: (amount: number) => string
}

/**
 * Хук для работы с региональными настройками
 * 
 * @param initialRegion - начальный код региона (по умолчанию PL)
 * 
 * @example
 * ```tsx
 * const { region, validatePhone, formatPhone, getNationalIdLabel } = useRegion('PL')
 * 
 * // В форме:
 * <Label>{getNationalIdLabel()}</Label>
 * <Input 
 *   placeholder={region.phone.placeholder}
 *   onChange={(e) => setPhone(formatPhone(e.target.value))}
 * />
 * ```
 */
export function useRegion(initialRegion: RegionCode = 'PL'): UseRegionReturn {
  const [regionCode, setRegionCode] = useState<RegionCode>(initialRegion)
  
  const region = useMemo(() => getRegion(regionCode), [regionCode])
  
  // Валидаторы
  const validateNationalIdFn = useCallback(
    (id: string) => validateNationalId(id, regionCode),
    [regionCode]
  )
  
  const validatePhoneFn = useCallback(
    (phone: string) => validatePhone(phone, regionCode),
    [regionCode]
  )
  
  // Форматтеры
  const formatPhoneFn = useCallback(
    (phone: string) => formatPhone(phone, regionCode),
    [regionCode]
  )
  
  const normalizePhoneFn = useCallback(
    (phone: string) => normalizePhone(phone, regionCode),
    [regionCode]
  )
  
  // Хелперы для UI
  const getPhonePlaceholder = useCallback(
    () => region.phone.placeholder,
    [region]
  )
  
  const getNationalIdLabel = useCallback(() => {
    if (!region.nationalId) return ''
    return region.nationalId.localName
  }, [region])
  
  const getNationalIdPlaceholder = useCallback(() => {
    if (!region.nationalId) return ''
    return '0'.repeat(region.nationalId.length)
  }, [region])
  
  const getNationalIdDescription = useCallback(() => {
    if (!region.nationalId) return ''
    return region.nationalId.description
  }, [region])
  
  const hasNationalId = useCallback(
    () => region.nationalId !== null,
    [region]
  )
  
  const getCurrencySymbol = useCallback(
    () => region.currency.symbol,
    [region]
  )
  
  const formatCurrency = useCallback(
    (amount: number) => {
      const { symbol, position, decimalSeparator, thousandSeparator } = region.currency
      
      const parts = amount.toFixed(2).split('.')
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator)
      const formattedAmount = `${integerPart}${decimalSeparator}${parts[1]}`
      
      return position === 'before' 
        ? `${symbol}${formattedAmount}` 
        : `${formattedAmount} ${symbol}`
    },
    [region]
  )
  
  return {
    region,
    regionCode,
    setRegionCode,
    validateNationalId: validateNationalIdFn,
    validatePhone: validatePhoneFn,
    formatPhone: formatPhoneFn,
    normalizePhone: normalizePhoneFn,
    getPhonePlaceholder,
    getNationalIdLabel,
    getNationalIdPlaceholder,
    getNationalIdDescription,
    hasNationalId,
    getCurrencySymbol,
    formatCurrency
  }
}

export default useRegion
