'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function RegisterConfirmClient() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />

        <h1 className="text-xl font-semibold mb-2">
          Проверьте почту
        </h1>

        <p className="text-gray-600 mb-4">
          Мы отправили письмо на <strong>{email}</strong>
        </p>

        <p className="text-sm text-gray-500 mb-6">
          Нажмите на ссылку в письме для подтверждения аккаунта
        </p>

        <Link href="/login" className="text-blue-600 hover:underline">
          Вернуться на страницу входа
        </Link>
      </Card>
    </div>
  )
}
