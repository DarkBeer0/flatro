// app/api/invitations/[code]/complete/route.ts
// REFACTORED: Returns error CODES instead of hardcoded Russian strings.
// FIXED: tenant.create now includes userId (owner), correct field names
// Uses $transaction to match original pattern.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'
import { getRegion, type RegionCode } from '@/lib/regions/config'
import { INVITE_ERROR_CODES } from '@/lib/i18n/invite-errors'

// Utility: validate phone per region
function validatePhone(phone: string, regionCode: string): boolean {
  const region = getRegion(regionCode as RegionCode)
  if (!region?.phone?.pattern) return true
  const cleaned = phone.replace(/[\s()-]/g, '')
  return region.phone.pattern.test(cleaned)
}

// Utility: normalize phone number
function normalizePhone(phone: string, regionCode: string): string {
  const region = getRegion(regionCode as RegionCode)
  const cleaned = phone.replace(/[\s()-]/g, '')
  if (region?.phone?.countryCode && !cleaned.startsWith('+')) {
    return region.phone.countryCode + cleaned
  }
  return cleaned
}

// Utility: validate national ID
function validateNationalId(id: string, regionCode: string): boolean {
  const region = getRegion(regionCode as RegionCode)
  if (!region?.nationalId?.pattern) return true
  if (!region.nationalId.pattern.test(id)) return false
  if (region.nationalId.checksumValidator) {
    return region.nationalId.checksumValidator(id)
  }
  return true
}

interface CompleteTenantRequest {
  firstName: string
  lastName: string
  phone?: string | null
  nationalId?: string | null
  nationalIdType?: string | null
  regionCode: RegionCode
  moveInDate?: string
  emergencyContact?: string | null
  emergencyPhone?: string | null
  termsAccepted: boolean
  privacyAccepted: boolean
  termsVersion: string
}

// Supabase client factory
async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* Server Component context */ }
        },
      },
    }
  )
}

// ============================================
// GET: Data for the completion form
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    const supabase = await createSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    const invitation = await prisma.invitation.findFirst({
      where: {
        code: code,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            country: true,
            userId: true,
          },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or expired', code: INVITE_ERROR_CODES.NOT_FOUND },
        { status: 404 }
      )
    }

    // Get owner name
    const owner = await prisma.user.findUnique({
      where: { id: invitation.property.userId },
      select: { firstName: true, lastName: true },
    })

    const ownerName = owner
      ? [owner.firstName, owner.lastName].filter(Boolean).join(' ') || 'Owner'
      : 'Owner'

    // Determine suggested region
    const countryToRegion: Record<string, RegionCode> = {
      Poland: 'PL', Polska: 'PL',
      Ukraine: 'UA', Україна: 'UA',
      Germany: 'DE', Deutschland: 'DE',
      'Czech Republic': 'CZ', Česko: 'CZ',
    }
    const suggestedRegion: RegionCode =
      (invitation.property.country
        ? countryToRegion[invitation.property.country]
        : undefined) || 'PL'

    return NextResponse.json({
      valid: true,
      propertyId: invitation.property.id,
      propertyName: invitation.property.name,
      propertyAddress: `${invitation.property.address}, ${invitation.property.city}`,
      ownerName,
      expiresAt: invitation.expiresAt.toISOString(),
      suggestedRegion,
      invitedEmail: invitation.email,
      isLoggedIn: !!session?.user,
    })
  } catch (error) {
    console.error('[Invite Complete GET] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================
// POST: Complete tenant registration via invite
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    // Auth check
    const supabase = await createSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: INVITE_ERROR_CODES.AUTH_REQUIRED },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const userEmail = session.user.email
    const body: CompleteTenantRequest = await request.json()
    const regionCode = body.regionCode || 'PL'
    const region = getRegion(regionCode)

    // ============================================
    // VALIDATION — returns codes, not messages
    // ============================================

    // First name
    if (!body.firstName?.trim()) {
      return NextResponse.json(
        { error: 'First name is required', code: INVITE_ERROR_CODES.FIRST_NAME_REQUIRED },
        { status: 400 }
      )
    }
    if (body.firstName.length < 2) {
      return NextResponse.json(
        { error: 'First name too short', code: INVITE_ERROR_CODES.FIRST_NAME_MIN_LENGTH },
        { status: 400 }
      )
    }

    // Last name
    if (!body.lastName?.trim()) {
      return NextResponse.json(
        { error: 'Last name is required', code: INVITE_ERROR_CODES.LAST_NAME_REQUIRED },
        { status: 400 }
      )
    }
    if (body.lastName.length < 2) {
      return NextResponse.json(
        { error: 'Last name too short', code: INVITE_ERROR_CODES.LAST_NAME_MIN_LENGTH },
        { status: 400 }
      )
    }

    // Name letters-only
    const nameRegex = /^[\p{L}\s-]+$/u
    if (!nameRegex.test(body.firstName)) {
      return NextResponse.json(
        { error: 'First name letters only', code: INVITE_ERROR_CODES.FIRST_NAME_LETTERS_ONLY },
        { status: 400 }
      )
    }
    if (!nameRegex.test(body.lastName)) {
      return NextResponse.json(
        { error: 'Last name letters only', code: INVITE_ERROR_CODES.LAST_NAME_LETTERS_ONLY },
        { status: 400 }
      )
    }

    // Terms
    if (!body.termsAccepted || !body.privacyAccepted) {
      return NextResponse.json(
        { error: 'Terms acceptance required', code: INVITE_ERROR_CODES.TERMS_REQUIRED },
        { status: 400 }
      )
    }

    // Phone
    if (body.phone && !validatePhone(body.phone, regionCode)) {
      return NextResponse.json(
        { error: 'Invalid phone number', code: INVITE_ERROR_CODES.PHONE_INVALID },
        { status: 400 }
      )
    }

    // National ID
    if (body.nationalId && !validateNationalId(body.nationalId, regionCode)) {
      return NextResponse.json(
        { error: 'Invalid national ID', code: INVITE_ERROR_CODES.NATIONAL_ID_INVALID },
        { status: 400 }
      )
    }

    // ============================================
    // FIND INVITATION
    // ============================================

    const invitation = await prisma.invitation.findFirst({
      where: { code, status: 'PENDING', expiresAt: { gt: new Date() } },
      include: {
        property: { select: { id: true, userId: true } },
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or expired', code: INVITE_ERROR_CODES.NOT_FOUND },
        { status: 404 }
      )
    }

    // Check email match (if invitation has specific email)
    if (invitation.email && invitation.email.toLowerCase() !== userEmail?.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation is for a different email', code: 'EMAIL_MISMATCH' },
        { status: 403 }
      )
    }

    // ============================================
    // CREATE/UPDATE DATA (in transaction)
    // ============================================

    const now = new Date()
    const normalizedPhone = body.phone ? normalizePhone(body.phone, regionCode) : null

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update or create User
      let user = await tx.user.findUnique({ where: { id: userId } })

      if (user) {
        user = await tx.user.update({
          where: { id: userId },
          data: {
            isTenant: true,
            regionCode: regionCode,
            termsAcceptedAt: now,
            privacyAcceptedAt: now,
            termsVersion: body.termsVersion,
            firstName: user.firstName || body.firstName.trim(),
            lastName: user.lastName || body.lastName.trim(),
            phone: user.phone || normalizedPhone,
            nationalId: body.nationalId || user.nationalId,
            nationalIdType: body.nationalIdType || user.nationalIdType,
          },
        })
      } else {
        user = await tx.user.create({
          data: {
            id: userId,
            email: userEmail!,
            firstName: body.firstName.trim(),
            lastName: body.lastName.trim(),
            phone: normalizedPhone,
            isTenant: true,
            regionCode: regionCode,
            termsAcceptedAt: now,
            privacyAcceptedAt: now,
            termsVersion: body.termsVersion,
          },
        })
      }

      // 2. Create tenant record
      // CRITICAL: userId = OWNER's user ID (from property relation "OwnerTenants")
      //           tenantUserId = the TENANT's user ID (relation "TenantUser")
      const tenant = await tx.tenant.create({
        data: {
          userId: invitation.property.userId,  // Owner's user ID (REQUIRED)
          propertyId: invitation.property.id,
          tenantUserId: userId,                // Tenant's user ID
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          email: userEmail || null,
          phone: normalizedPhone,
          nationalId: body.nationalId || null,
          nationalIdType: body.nationalIdType || null,
          regionCode: regionCode,
          moveInDate: body.moveInDate ? new Date(body.moveInDate) : now,
          emergencyContact: body.emergencyContact || null,
          emergencyPhone: body.emergencyPhone
            ? normalizePhone(body.emergencyPhone, regionCode)
            : null,
          isActive: true,
          termsAcceptedAt: now,
          termsVersion: body.termsVersion,
          registrationCompletedAt: now,
        },
      })

      // 3. Mark invitation as used
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          usedAt: now,
          usedBy: userId,          // Field is `usedBy` (not `usedByUserId`)
          tenantId: tenant.id,
        },
      })

      // 4. Update property status
      await tx.property.update({
        where: { id: invitation.property.id },
        data: { status: 'OCCUPIED' },
      })

      return tenant
    })

    return NextResponse.json(
      { success: true, tenantId: result.id },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Invite Complete] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}