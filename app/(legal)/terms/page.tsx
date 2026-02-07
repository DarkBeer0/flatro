/**
 * Страница пользовательского соглашения
 * 
 * Путь в проекте: app/(legal)/terms/page.tsx
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Пользовательское соглашение | Flatro',
  description: 'Пользовательское соглашение сервиса Flatro для управления арендой недвижимости'
}

export default function TermsOfServicePage() {
  const version = '1.0'
  const lastUpdated = '1 января 2025'

  return (
    <div className="min-h-screen bg-white">
      {/* Шапка */}
      <header className="border-b sticky top-0 bg-white z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <span className="text-sm text-gray-500">
            Версия {version} от {lastUpdated}
          </span>
        </div>
      </header>

      {/* Контент */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <article className="prose prose-gray max-w-none">
          <h1 className="text-3xl font-bold mb-2">Пользовательское соглашение</h1>
          <p className="text-gray-600 mb-8">
            Сервис управления арендой недвижимости Flatro
          </p>

          {/* 1. Общие положения */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Общие положения</h2>
            
            <p>
              Настоящее Пользовательское соглашение регулирует отношения между 
              владельцем сервиса Flatro (далее — «Администрация») и физическим лицом, 
              использующим сервис (далее — «Пользователь»).
            </p>

            <h3 className="text-lg font-medium mb-2 mt-4">1.1. Определения</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Flatro</strong> — веб-приложение для управления арендой недвижимости</li>
              <li><strong>Владелец (Арендодатель)</strong> — Пользователь, управляющий объектами недвижимости</li>
              <li><strong>Арендатор</strong> — Пользователь, приглашённый Владельцем как жилец</li>
              <li><strong>Персональные данные</strong> — информация, позволяющая идентифицировать Пользователя</li>
            </ul>
          </section>

          {/* 2. Предмет соглашения */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Предмет соглашения</h2>
            
            <p>Администрация предоставляет Пользователю доступ к следующим функциям:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Регистрация и управление объектами недвижимости</li>
              <li>Ведение базы арендаторов</li>
              <li>Учёт платежей за аренду и коммунальные услуги</li>
              <li>Генерация договоров аренды</li>
              <li>Ввод и расчёт показаний счётчиков</li>
              <li>Уведомления о платежах и событиях</li>
            </ul>
          </section>

          {/* 3. Права и обязанности */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Права и обязанности</h2>
            
            <h3 className="text-lg font-medium mb-2">3.1. Обязанности Пользователя</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Предоставлять достоверные данные при регистрации</li>
              <li>Обеспечивать конфиденциальность учётных данных</li>
              <li>Не использовать Сервис для незаконной деятельности</li>
              <li>Соблюдать права интеллектуальной собственности</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 mt-4">3.2. Права Администрации</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Изменять функциональность Сервиса с уведомлением</li>
              <li>Приостанавливать доступ при нарушении условий</li>
              <li>Изменять условия Соглашения с предварительным уведомлением</li>
            </ul>
          </section>

          {/* 4. Конфиденциальность */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Конфиденциальность</h2>
            <p>
              Обработка персональных данных осуществляется в соответствии с{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Политикой конфиденциальности
              </Link>
              , которая является неотъемлемой частью настоящего Соглашения.
            </p>
            <p className="mt-2">
              Администрация обрабатывает данные в соответствии с GDPR (Общий регламент защиты данных).
            </p>
          </section>

          {/* 5. Ответственность */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Ответственность</h2>
            <p>Администрация не несёт ответственности за:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Убытки, возникшие в результате действий Пользователя</li>
              <li>Содержание данных, загружаемых Пользователем</li>
              <li>Юридическую силу документов, сгенерированных с помощью Сервиса</li>
            </ul>
          </section>

          {/* 6. Заключительные положения */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Заключительные положения</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Соглашение вступает в силу с момента его принятия</li>
              <li>Администрация вправе вносить изменения с уведомлением за 14 дней</li>
              <li>Споры разрешаются путём переговоров или в суде</li>
            </ul>
          </section>

          {/* Контакты */}
          <section className="border-t pt-8">
            <h2 className="text-xl font-semibold mb-4">Контакты</h2>
            <ul className="list-none space-y-1">
              <li><strong>Email:</strong> support@flatro.app</li>
            </ul>
          </section>

          <footer className="mt-12 pt-8 border-t text-sm text-gray-500">
            <p>Последнее обновление: {lastUpdated}</p>
            <p>Версия документа: {version}</p>
          </footer>
        </article>
      </main>
    </div>
  )
}
