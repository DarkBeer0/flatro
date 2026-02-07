import { Suspense } from 'react'
import RegisterConfirmClient from './RegisterConfirmClient'

export default function RegisterConfirmPage() {
  return (
    <Suspense fallback={<ConfirmLoading />}>
      <RegisterConfirmClient />
    </Suspense>
  )
}

function ConfirmLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-600">Загрузка...</p>
    </div>
  )
}
