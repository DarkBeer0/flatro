/**
 * Конфигурация регионов для масштабирования Flatro
 * 
 * Путь в проекте: lib/regions/config.ts
 * 
 * Этот файл содержит настройки для разных стран/регионов:
 * - Форматы телефонов
 * - Национальные идентификаторы (PESEL, NIP, etc.)
 * - Валюты
 * - Локализация
 */

export type RegionCode = 'PL' | 'UA' | 'DE' | 'CZ' | 'SK' | 'LT' | 'LV' | 'EE'

export interface PhoneConfig {
  countryCode: string        // "+48"
  format: string             // "XXX XXX XXX"
  placeholder: string        // "+48 123 456 789"
  minDigits: number          // 9
  maxDigits: number          // 9
  pattern: RegExp            // Регулярное выражение для валидации
}

export interface NationalIdConfig {
  name: string               // "PESEL"
  localName: string          // "PESEL" (на локальном языке)
  length: number             // 11
  pattern: RegExp            // Паттерн валидации
  required: boolean          // Обязательно ли
  hasChecksum: boolean       // Есть ли контрольная сумма
  checksumValidator?: (id: string) => boolean  // Функция проверки
  description: string        // Описание для пользователя
}

export interface CurrencyConfig {
  code: string               // "PLN"
  symbol: string             // "zł"
  position: 'before' | 'after'  // Позиция символа
  decimalSeparator: string   // ","
  thousandSeparator: string  // " "
}

export interface LegalConfig {
  dataProtectionLaw: string  // "RODO" / "GDPR"
  supervisoryAuthority: {
    name: string             // "UODO"
    url: string              // "https://uodo.gov.pl"
  }
  contractTypes: string[]    // ["najem okazjonalny", "najem instytucjonalny"]
}

export interface RegionConfig {
  code: RegionCode
  name: string               // "Polska"
  nameEn: string             // "Poland"
  flag: string               // "🇵🇱"
  language: string           // "pl"
  timezone: string           // "Europe/Warsaw"
  phone: PhoneConfig
  nationalId: NationalIdConfig | null  // null если нет национального ID
  currency: CurrencyConfig
  legal: LegalConfig
  dateFormat: string         // "DD.MM.YYYY"
}

// ============================================
// ВАЛИДАТОРЫ НАЦИОНАЛЬНЫХ ИДЕНТИФИКАТОРОВ
// ============================================

/**
 * Валидация польского PESEL
 */
export function validatePesel(pesel: string): boolean {
  if (!pesel || pesel.length !== 11 || !/^\d{11}$/.test(pesel)) {
    return false
  }
  
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]
  let sum = 0
  
  for (let i = 0; i < 10; i++) {
    sum += parseInt(pesel[i]) * weights[i]
  }
  
  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === parseInt(pesel[10])
}

/**
 * Валидация украинского ИНН (РНОКПП)
 */
export function validateUkrainianInn(inn: string): boolean {
  if (!inn || inn.length !== 10 || !/^\d{10}$/.test(inn)) {
    return false
  }
  
  const weights = [-1, 5, 7, 9, 4, 6, 10, 5, 7]
  let sum = 0
  
  for (let i = 0; i < 9; i++) {
    sum += parseInt(inn[i]) * weights[i]
  }
  
  const checkDigit = (sum % 11) % 10
  return checkDigit === parseInt(inn[9])
}

/**
 * Валидация немецкого Steuer-ID
 */
export function validateGermanSteuerID(id: string): boolean {
  if (!id || id.length !== 11 || !/^\d{11}$/.test(id)) {
    return false
  }
  // Упрощённая валидация - первая цифра не 0
  return id[0] !== '0'
}

/**
 * Валидация чешского Rodné číslo
 */
export function validateCzechRodneČislo(rc: string): boolean {
  const cleaned = rc.replace('/', '')
  if (!/^\d{9,10}$/.test(cleaned)) {
    return false
  }
  
  if (cleaned.length === 10) {
    const num = parseInt(cleaned)
    return num % 11 === 0
  }
  
  return true // Для старых 9-значных номеров
}

// ============================================
// КОНФИГУРАЦИИ РЕГИОНОВ
// ============================================

export const REGIONS: Record<RegionCode, RegionConfig> = {
  PL: {
    code: 'PL',
    name: 'Polska',
    nameEn: 'Poland',
    flag: '🇵🇱',
    language: 'pl',
    timezone: 'Europe/Warsaw',
    phone: {
      countryCode: '+48',
      format: 'XXX XXX XXX',
      placeholder: '+48 123 456 789',
      minDigits: 9,
      maxDigits: 9,
      pattern: /^(\+48)?[0-9]{9}$/
    },
    nationalId: {
      name: 'PESEL',
      localName: 'PESEL',
      length: 11,
      pattern: /^\d{11}$/,
      required: false,
      hasChecksum: true,
      checksumValidator: validatePesel,
      description: 'Numer PESEL (opcjonalnie, do oficjalnej umowy)'
    },
    currency: {
      code: 'PLN',
      symbol: 'zł',
      position: 'after',
      decimalSeparator: ',',
      thousandSeparator: ' '
    },
    legal: {
      dataProtectionLaw: 'RODO',
      supervisoryAuthority: {
        name: 'UODO (Urząd Ochrony Danych Osobowych)',
        url: 'https://uodo.gov.pl'
      },
      contractTypes: ['najem okazjonalny', 'najem instytucjonalny', 'najem zwykły']
    },
    dateFormat: 'DD.MM.YYYY'
  },

  UA: {
    code: 'UA',
    name: 'Україна',
    nameEn: 'Ukraine',
    flag: '🇺🇦',
    language: 'uk',
    timezone: 'Europe/Kiev',
    phone: {
      countryCode: '+380',
      format: 'XX XXX XX XX',
      placeholder: '+380 50 123 45 67',
      minDigits: 9,
      maxDigits: 9,
      pattern: /^(\+380)?[0-9]{9}$/
    },
    nationalId: {
      name: 'INN',
      localName: 'ІПН (РНОКПП)',
      length: 10,
      pattern: /^\d{10}$/,
      required: false,
      hasChecksum: true,
      checksumValidator: validateUkrainianInn,
      description: 'Ідентифікаційний номер платника податків (необов\'язково)'
    },
    currency: {
      code: 'UAH',
      symbol: '₴',
      position: 'after',
      decimalSeparator: ',',
      thousandSeparator: ' '
    },
    legal: {
      dataProtectionLaw: 'Закон про захист персональних даних',
      supervisoryAuthority: {
        name: 'Уповноважений ВРУ з прав людини',
        url: 'https://www.ombudsman.gov.ua'
      },
      contractTypes: ['договір найму житла', 'договір оренди']
    },
    dateFormat: 'DD.MM.YYYY'
  },

  DE: {
    code: 'DE',
    name: 'Deutschland',
    nameEn: 'Germany',
    flag: '🇩🇪',
    language: 'de',
    timezone: 'Europe/Berlin',
    phone: {
      countryCode: '+49',
      format: 'XXXX XXXXXXX',
      placeholder: '+49 1512 3456789',
      minDigits: 10,
      maxDigits: 11,
      pattern: /^(\+49)?[0-9]{10,11}$/
    },
    nationalId: {
      name: 'Steuer-ID',
      localName: 'Steueridentifikationsnummer',
      length: 11,
      pattern: /^\d{11}$/,
      required: false,
      hasChecksum: true,
      checksumValidator: validateGermanSteuerID,
      description: 'Steueridentifikationsnummer (optional)'
    },
    currency: {
      code: 'EUR',
      symbol: '€',
      position: 'after',
      decimalSeparator: ',',
      thousandSeparator: '.'
    },
    legal: {
      dataProtectionLaw: 'DSGVO',
      supervisoryAuthority: {
        name: 'BfDI (Bundesbeauftragter für den Datenschutz)',
        url: 'https://www.bfdi.bund.de'
      },
      contractTypes: ['Mietvertrag', 'Untermietvertrag']
    },
    dateFormat: 'DD.MM.YYYY'
  },

  CZ: {
    code: 'CZ',
    name: 'Česko',
    nameEn: 'Czech Republic',
    flag: '🇨🇿',
    language: 'cs',
    timezone: 'Europe/Prague',
    phone: {
      countryCode: '+420',
      format: 'XXX XXX XXX',
      placeholder: '+420 123 456 789',
      minDigits: 9,
      maxDigits: 9,
      pattern: /^(\+420)?[0-9]{9}$/
    },
    nationalId: {
      name: 'Rodné číslo',
      localName: 'Rodné číslo',
      length: 10,
      pattern: /^\d{9,10}$/,
      required: false,
      hasChecksum: true,
      checksumValidator: validateCzechRodneČislo,
      description: 'Rodné číslo (nepovinné)'
    },
    currency: {
      code: 'CZK',
      symbol: 'Kč',
      position: 'after',
      decimalSeparator: ',',
      thousandSeparator: ' '
    },
    legal: {
      dataProtectionLaw: 'GDPR',
      supervisoryAuthority: {
        name: 'ÚOOÚ',
        url: 'https://www.uoou.cz'
      },
      contractTypes: ['nájemní smlouva', 'podnájemní smlouva']
    },
    dateFormat: 'DD.MM.YYYY'
  },

  SK: {
    code: 'SK',
    name: 'Slovensko',
    nameEn: 'Slovakia',
    flag: '🇸🇰',
    language: 'sk',
    timezone: 'Europe/Bratislava',
    phone: {
      countryCode: '+421',
      format: 'XXX XXX XXX',
      placeholder: '+421 912 345 678',
      minDigits: 9,
      maxDigits: 9,
      pattern: /^(\+421)?[0-9]{9}$/
    },
    nationalId: {
      name: 'Rodné číslo',
      localName: 'Rodné číslo',
      length: 10,
      pattern: /^\d{9,10}$/,
      required: false,
      hasChecksum: true,
      checksumValidator: validateCzechRodneČislo, // Похожий формат
      description: 'Rodné číslo (nepovinné)'
    },
    currency: {
      code: 'EUR',
      symbol: '€',
      position: 'after',
      decimalSeparator: ',',
      thousandSeparator: ' '
    },
    legal: {
      dataProtectionLaw: 'GDPR',
      supervisoryAuthority: {
        name: 'Úrad na ochranu osobných údajov',
        url: 'https://dataprotection.gov.sk'
      },
      contractTypes: ['nájomná zmluva', 'podnájomná zmluva']
    },
    dateFormat: 'DD.MM.YYYY'
  },

  LT: {
    code: 'LT',
    name: 'Lietuva',
    nameEn: 'Lithuania',
    flag: '🇱🇹',
    language: 'lt',
    timezone: 'Europe/Vilnius',
    phone: {
      countryCode: '+370',
      format: 'XXX XXXXX',
      placeholder: '+370 612 34567',
      minDigits: 8,
      maxDigits: 8,
      pattern: /^(\+370)?[0-9]{8}$/
    },
    nationalId: {
      name: 'Asmens kodas',
      localName: 'Asmens kodas',
      length: 11,
      pattern: /^\d{11}$/,
      required: false,
      hasChecksum: false,
      description: 'Asmens kodas (neprivaloma)'
    },
    currency: {
      code: 'EUR',
      symbol: '€',
      position: 'after',
      decimalSeparator: ',',
      thousandSeparator: ' '
    },
    legal: {
      dataProtectionLaw: 'BDAR (GDPR)',
      supervisoryAuthority: {
        name: 'VDAI',
        url: 'https://vdai.lrv.lt'
      },
      contractTypes: ['nuomos sutartis']
    },
    dateFormat: 'YYYY-MM-DD'
  },

  LV: {
    code: 'LV',
    name: 'Latvija',
    nameEn: 'Latvia',
    flag: '🇱🇻',
    language: 'lv',
    timezone: 'Europe/Riga',
    phone: {
      countryCode: '+371',
      format: 'XXXX XXXX',
      placeholder: '+371 2012 3456',
      minDigits: 8,
      maxDigits: 8,
      pattern: /^(\+371)?[0-9]{8}$/
    },
    nationalId: {
      name: 'Personas kods',
      localName: 'Personas kods',
      length: 11,
      pattern: /^\d{6}-?\d{5}$/,
      required: false,
      hasChecksum: false,
      description: 'Personas kods (nav obligāti)'
    },
    currency: {
      code: 'EUR',
      symbol: '€',
      position: 'after',
      decimalSeparator: ',',
      thousandSeparator: ' '
    },
    legal: {
      dataProtectionLaw: 'VDAR (GDPR)',
      supervisoryAuthority: {
        name: 'Datu valsts inspekcija',
        url: 'https://www.dvi.gov.lv'
      },
      contractTypes: ['īres līgums']
    },
    dateFormat: 'DD.MM.YYYY'
  },

  EE: {
    code: 'EE',
    name: 'Eesti',
    nameEn: 'Estonia',
    flag: '🇪🇪',
    language: 'et',
    timezone: 'Europe/Tallinn',
    phone: {
      countryCode: '+372',
      format: 'XXXX XXXX',
      placeholder: '+372 5123 4567',
      minDigits: 7,
      maxDigits: 8,
      pattern: /^(\+372)?[0-9]{7,8}$/
    },
    nationalId: {
      name: 'Isikukood',
      localName: 'Isikukood',
      length: 11,
      pattern: /^\d{11}$/,
      required: false,
      hasChecksum: true,
      description: 'Isikukood (valikuline)'
    },
    currency: {
      code: 'EUR',
      symbol: '€',
      position: 'after',
      decimalSeparator: ',',
      thousandSeparator: ' '
    },
    legal: {
      dataProtectionLaw: 'GDPR',
      supervisoryAuthority: {
        name: 'Andmekaitse Inspektsioon',
        url: 'https://www.aki.ee'
      },
      contractTypes: ['üürileping']
    },
    dateFormat: 'DD.MM.YYYY'
  }
}

// ============================================
// ХЕЛПЕРЫ
// ============================================

/**
 * Получить конфигурацию региона по коду
 */
export function getRegion(code: RegionCode): RegionConfig {
  return REGIONS[code]
}

/**
 * Получить регион по умолчанию
 */
export function getDefaultRegion(): RegionConfig {
  return REGIONS.PL
}

/**
 * Получить список всех регионов для селектора
 */
export function getRegionsList(): Array<{ code: RegionCode; name: string; flag: string }> {
  return Object.values(REGIONS).map(r => ({
    code: r.code,
    name: r.name,
    flag: r.flag
  }))
}

/**
 * Валидировать национальный ID для указанного региона
 */
export function validateNationalId(id: string, regionCode: RegionCode): boolean {
  const region = getRegion(regionCode)
  
  if (!region.nationalId) {
    return true // Нет национального ID для этого региона
  }
  
  if (!id) {
    return !region.nationalId.required // Пусто = OK если не обязательно
  }
  
  // Проверка паттерна
  if (!region.nationalId.pattern.test(id)) {
    return false
  }
  
  // Проверка контрольной суммы если есть
  if (region.nationalId.hasChecksum && region.nationalId.checksumValidator) {
    return region.nationalId.checksumValidator(id)
  }
  
  return true
}

/**
 * Валидировать телефон для указанного региона
 */
export function validatePhone(phone: string, regionCode: RegionCode): boolean {
  const region = getRegion(regionCode)
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  
  return region.phone.pattern.test(cleaned)
}

/**
 * Форматировать телефон для указанного региона
 */
export function formatPhone(phone: string, regionCode: RegionCode): string {
  const region = getRegion(regionCode)
  let cleaned = phone.replace(/\D/g, '')
  
  // Убираем код страны если есть
  const codeDigits = region.phone.countryCode.replace('+', '')
  if (cleaned.startsWith(codeDigits)) {
    cleaned = cleaned.slice(codeDigits.length)
  }
  
  // Форматируем согласно шаблону
  const format = region.phone.format
  let result = region.phone.countryCode + ' '
  let digitIndex = 0
  
  for (const char of format) {
    if (char === 'X') {
      if (digitIndex < cleaned.length) {
        result += cleaned[digitIndex]
        digitIndex++
      }
    } else {
      if (digitIndex < cleaned.length) {
        result += char
      }
    }
  }
  
  return result.trim()
}

/**
 * Нормализовать телефон к международному формату
 */
export function normalizePhone(phone: string, regionCode: RegionCode): string {
  const region = getRegion(regionCode)
  const cleaned = phone.replace(/\D/g, '')
  const codeDigits = region.phone.countryCode.replace('+', '')
  
  if (cleaned.startsWith(codeDigits)) {
    return `+${cleaned}`
  }
  
  return `${region.phone.countryCode}${cleaned}`
}
