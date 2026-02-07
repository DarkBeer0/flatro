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
      firstName: true,
      lastName: true,
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
    // Разбираем имя из метаданных если есть
    const fullName = user.user_metadata?.name || ''
    const nameParts = fullName.split(' ')
    const firstName = user.user_metadata?.first_name || nameParts[0] || null
    const lastName = user.user_metadata?.last_name || nameParts.slice(1).join(' ') || null

    dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        firstName,
        lastName,
        isOwner: false,
        isTenant: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
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

  // Добавляем вычисляемое поле name для совместимости
  return {
    ...dbUser,
    name: [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || null,
  }
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}