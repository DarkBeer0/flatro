// app/(tenant)/tenant/messages/[propertyId]/page.tsx
'use client'

import { use } from 'react'
import { ChatWindow } from '@/components/chat'

interface PageProps {
  params: Promise<{ propertyId: string }>
}

export default function TenantChatPage({ params }: PageProps) {
  const { propertyId } = use(params)

  return (
    <div className="w-full h-full">
      {/* Page Header */}
      <div className="mb-4 lg:mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Сообщения
        </h1>
      </div>

      {/* Chat Window */}
      <div className="h-[calc(100vh-200px)] min-h-[500px]">
        <ChatWindow
          propertyId={propertyId}
          backLink="/tenant/messages"
          backLabel="Все чаты"
          pollingInterval={5000}
        />
      </div>
    </div>
  )
}
