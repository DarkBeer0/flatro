// lib/auth.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Найти или создать пользователя в БД
  // Используем select чтобы запрашивать только существующие поля
  let dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      isOwner: true,
      isTenant: true,
      bankName: true,
      iban: true,
      accountHolder: true,
      stripeAccountId: true,
      stripeOnboarded: true,
      createdAt: true,
      updatedAt: true,
    }
  })

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || null,
        isOwner: false,
        isTenant: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isOwner: true,
        isTenant: true,
        bankName: true,
        iban: true,
        accountHolder: true,
        stripeAccountId: true,
        stripeOnboarded: true,
        createdAt: true,
        updatedAt: true,
      }
    })
  }

  return dbUser
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}