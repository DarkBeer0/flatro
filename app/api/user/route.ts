// app/api/user/route.ts
// GET — получить пользователя
// PUT — обновить профиль с полной серверной валидацией

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import {
  validateNationalId,
  validatePhone,
  normalizePhone,
  type RegionCode,
} from '@/lib/regions/config'

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════

const NAME_REGEX = /^[\p{L}\s-]*$/u
const IBAN_REGEX = /^[A-Z]{2}\d{2}[A-Z0-9]+$/

const POSTAL_CODE_PATTERNS: Record<string, RegExp> = {
  PL: /^\d{2}-\d{3}$/,
  DE: /^\d{5}$/,
  UA: /^\d{5}$/,
  CZ: /^\d{3}\s?\d{2}$/,
  SK: /^\d{3}\s?\d{2}$/,
  LT: /^LT-\d{5}$/,
  LV: /^LV-\d{4}$/,
  EE: /^\d{5}$/,
}

function serverValidateIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase()
  if (cleaned.length < 15 || cleaned.length > 34) return false
  if (!IBAN_REGEX.test(cleaned)) return false

  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4)
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55))

  let remainder = ''
  for (const digit of numeric) {
    remainder += digit
    const val = parseInt(remainder, 10)
    remainder = String(val % 97)
  }
  return parseInt(remainder, 10) === 1
}

interface ValidationError {
  field: string
  error: string
}

function validateProfileData(
  body: Record<string, any>,
  regionCode: RegionCode,
  isOwner: boolean
): ValidationError | null {
  const { firstName, lastName, phone, iban, postalCode, nationalId, nationalIdType, accountHolder, address, city } = body

  // ── Names ─────────────────────────────────────────────────
  if (firstName !== undefined && firstName.trim().length > 0) {
    const fn = firstName.trim()
    if (fn.length < 2) return { field: 'firstName', error: 'Imię musi mieć co najmniej 2 znaki' }
    if (fn.length > 50) return { field: 'firstName', error: 'Imię nie może być dłuższe niż 50 znaków' }
    if (!NAME_REGEX.test(fn)) return { field: 'firstName', error: 'Imię może zawierać tylko litery, spacje i myślniki' }
  }

  if (lastName !== undefined && lastName.trim().length > 0) {
    const ln = lastName.trim()
    if (ln.length < 2) return { field: 'lastName', error: 'Nazwisko musi mieć co najmniej 2 znaki' }
    if (ln.length > 50) return { field: 'lastName', error: 'Nazwisko nie może być dłuższe niż 50 znaków' }
    if (!NAME_REGEX.test(ln)) return { field: 'lastName', error: 'Nazwisko może zawierać tylko litery, spacje i myślniki' }
  }

  // ── Phone ─────────────────────────────────────────────────
  if (phone !== undefined && phone.trim().length > 0) {
    if (!validatePhone(phone.trim(), regionCode)) {
      return { field: 'phone', error: 'Nieprawidłowy numer telefonu' }
    }
  }

  // ── Owner-only fields ─────────────────────────────────────
  if (isOwner) {
    // IBAN
    if (iban !== undefined && iban.trim().length > 0) {
      if (!serverValidateIBAN(iban.trim())) {
        return { field: 'iban', error: 'Nieprawidłowy numer IBAN' }
      }
    }

    // Postal code
    if (postalCode !== undefined && postalCode.trim().length > 0) {
      const pattern = POSTAL_CODE_PATTERNS[regionCode]
      if (pattern && !pattern.test(postalCode.trim())) {
        return { field: 'postalCode', error: 'Nieprawidłowy kod pocztowy' }
      }
    }

    // National ID
    if (nationalId !== undefined && nationalId.trim().length > 0) {
      // Only validate with region validator if type matches region's national ID
      if (nationalIdType && nationalIdType !== 'PASSPORT' && nationalIdType !== 'ID_CARD') {
        if (!validateNationalId(nationalId.trim(), regionCode)) {
          return { field: 'nationalId', error: `Nieprawidłowy ${nationalIdType || 'numer identyfikacyjny'}` }
        }
      }
    }

    // Account holder
    if (accountHolder !== undefined && accountHolder.trim().length > 0) {
      const ah = accountHolder.trim()
      if (ah.length < 3) return { field: 'accountHolder', error: 'Wpisz pełne imię i nazwisko właściciela konta' }
      if (!/^[\p{L}\s.-]+$/u.test(ah)) return { field: 'accountHolder', error: 'Nazwa właściciela może zawierać tylko litery' }
    }

    // Address
    if (address !== undefined && address.trim().length > 0) {
      if (address.trim().length < 5) return { field: 'address', error: 'Adres jest za krótki' }
    }

    // City
    if (city !== undefined && city.trim().length > 0) {
      const c = city.trim()
      if (c.length < 2) return { field: 'city', error: 'Nazwa miasta musi mieć co najmniej 2 znaki' }
      if (!/^[\p{L}\s-]+$/u.test(c)) return { field: 'city', error: 'Nazwa miasta może zawierać tylko litery' }
    }
  }

  return null
}

// ═══════════════════════════════════════════════════════════════
// GET
// ═══════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isOwner: true,
        isTenant: true,
        regionCode: true,
        address: true,
        city: true,
        postalCode: true,
        nationalId: true,
        nationalIdType: true,
        bankName: true,
        iban: true,
        accountHolder: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!dbUser) {
      return NextResponse.json({
        error: 'User not found. Please complete registration.',
        code: 'USER_NOT_REGISTERED'
      }, { status: 404 })
    }

    const role = dbUser.isOwner ? 'OWNER' : (dbUser.isTenant ? 'TENANT' : 'OWNER')
    const fullName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || null

    return NextResponse.json({
      ...dbUser,
      name: fullName,
      role,
    })
  } catch (error) {
    console.error('Error getting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════
// PUT
// ═══════════════════════════════════════════════════════════════

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, isOwner: true, regionCode: true }
    })

    if (!existingUser) {
      return NextResponse.json({
        error: 'User not found',
        code: 'USER_NOT_REGISTERED'
      }, { status: 404 })
    }

    const body = await request.json()
    const {
      firstName, lastName, name, phone,
      bankName, iban, accountHolder,
      address, city, postalCode, nationalId, nationalIdType,
    } = body

    // ── Server-side validation ──────────────────────────────
    const regionCode = (existingUser.regionCode || 'PL') as RegionCode
    const validationError = validateProfileData(body, regionCode, existingUser.isOwner)

    if (validationError) {
      return NextResponse.json(validationError, { status: 400 })
    }

    // ── Build update data ───────────────────────────────────
    const updateData: Record<string, unknown> = {}

    if (firstName !== undefined) updateData.firstName = firstName.trim() || null
    if (lastName !== undefined) updateData.lastName = lastName.trim() || null

    // Обратная совместимость
    if (name !== undefined && firstName === undefined && lastName === undefined) {
      const nameParts = (name || '').trim().split(' ')
      updateData.firstName = nameParts[0] || null
      updateData.lastName = nameParts.slice(1).join(' ') || null
    }

    // Phone — нормализуем к международному формату
    if (phone !== undefined) {
      const cleaned = phone?.trim()
      if (cleaned) {
        updateData.phone = normalizePhone(cleaned, regionCode)
      } else {
        updateData.phone = null
      }
    }

    // Данные владельца
    if (existingUser.isOwner) {
      if (bankName !== undefined) updateData.bankName = bankName?.trim() || null
      if (iban !== undefined) updateData.iban = iban?.replace(/\s/g, '').trim() || null
      if (accountHolder !== undefined) updateData.accountHolder = accountHolder?.trim() || null
      if (address !== undefined) updateData.address = address?.trim() || null
      if (city !== undefined) updateData.city = city?.trim() || null
      if (postalCode !== undefined) updateData.postalCode = postalCode?.trim() || null
      if (nationalId !== undefined) updateData.nationalId = nationalId?.trim() || null
      if (nationalIdType !== undefined) updateData.nationalIdType = nationalIdType?.trim() || null
    }

    const dbUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isOwner: true,
        isTenant: true,
        regionCode: true,
        address: true,
        city: true,
        postalCode: true,
        nationalId: true,
        nationalIdType: true,
        bankName: true,
        iban: true,
        accountHolder: true,
        updatedAt: true,
      }
    })

    const role = dbUser.isOwner ? 'OWNER' : (dbUser.isTenant ? 'TENANT' : 'OWNER')
    const fullName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || null

    return NextResponse.json({
      ...dbUser,
      name: fullName,
      role,
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}