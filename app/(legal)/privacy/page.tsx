/**
 * Страница политики конфиденциальности
 * 
 * Путь в проекте: app/(legal)/privacy/page.tsx
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Политика конфиденциальности | Flatro',
  description: 'Политика конфиденциальности и обработки персональных данных сервиса Flatro'
}

export default function PrivacyPolicyPage() {
  const version = '1.0'
  const lastUpdated = '1 января 2025'

  return (
    <div className="min-h-screen bg-white">
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

      <main className="max-w-4xl mx-auto px-4 py-8">
        <article className="prose prose-gray max-w-none">
          <h1 className="text-3xl font-bold mb-2">Политика конфиденциальности</h1>
          <p className="text-gray-600 mb-8">
            Обработка персональных данных в соответствии с GDPR
          </p>

          {/* 1. Администратор данных */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Администратор персональных данных</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p><strong>Flatro</strong></p>
              <p>Email: privacy@flatro.app</p>
              <p>DPO: dpo@flatro.app</p>
            </div>
          </section>

          {/* 2. Категории данных */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Какие данные мы собираем</h2>
            
            <table className="w-full border-collapse border border-gray-200 mt-2">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left">Категория</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Примеры</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-4 py-2">Идентификационные</td>
                  <td className="border border-gray-200 px-4 py-2">Имя, фамилия, национальный ID</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-2">Контактные</td>
                  <td className="border border-gray-200 px-4 py-2">Email, телефон, адрес</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-2">Финансовые</td>
                  <td className="border border-gray-200 px-4 py-2">История платежей</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-2">Технические</td>
                  <td className="border border-gray-200 px-4 py-2">IP-адрес, cookies</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* 3. Цели обработки */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Цели обработки</h2>
            
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left">Цель</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Правовое основание</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-4 py-2">Предоставление сервиса</td>
                  <td className="border border-gray-200 px-4 py-2">Ст. 6(1)(b) GDPR — договор</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-2">Уведомления</td>
                  <td className="border border-gray-200 px-4 py-2">Ст. 6(1)(f) GDPR — законный интерес</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-2">Маркетинг</td>
                  <td className="border border-gray-200 px-4 py-2">Ст. 6(1)(a) GDPR — согласие</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* 4. Права пользователя */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Ваши права</h2>
            
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium">Право на доступ (ст. 15)</h4>
                <p className="text-sm text-gray-600">Узнать, какие данные мы обрабатываем</p>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium">Право на исправление (ст. 16)</h4>
                <p className="text-sm text-gray-600">Исправить неточные данные</p>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium">Право на удаление (ст. 17)</h4>
                <p className="text-sm text-gray-600">«Право быть забытым»</p>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium">Право на переносимость (ст. 20)</h4>
                <p className="text-sm text-gray-600">Получить данные в машиночитаемом формате</p>
              </div>
            </div>

            <p className="mt-4">
              Для реализации прав: <strong>privacy@flatro.app</strong>
            </p>
          </section>

          {/* 5. Надзорные органы */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Надзорные органы</h2>
            <p>Вы можете подать жалобу в надзорный орган вашей страны:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>🇵🇱 Польша: UODO — <a href="https://uodo.gov.pl" className="text-blue-600">uodo.gov.pl</a></li>
              <li>🇺🇦 Украина: Уполномоченный ВРУ — <a href="https://www.ombudsman.gov.ua" className="text-blue-600">ombudsman.gov.ua</a></li>
              <li>🇩🇪 Германия: BfDI — <a href="https://www.bfdi.bund.de" className="text-blue-600">bfdi.bund.de</a></li>
              <li>🇨🇿 Чехия: ÚOOÚ — <a href="https://www.uoou.cz" className="text-blue-600">uoou.cz</a></li>
            </ul>
          </section>

          {/* 6. Сроки хранения */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Сроки хранения данных</h2>
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left">Данные</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Срок</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-4 py-2">Аккаунт</td>
                  <td className="border border-gray-200 px-4 py-2">До удаления + 30 дней</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-2">Договоры</td>
                  <td className="border border-gray-200 px-4 py-2">10 лет</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-2">Платежи</td>
                  <td className="border border-gray-200 px-4 py-2">5 лет</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-2">Логи</td>
                  <td className="border border-gray-200 px-4 py-2">12 месяцев</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* 7. Безопасность */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Защита данных</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Шифрование при передаче (TLS 1.3)</li>
              <li>Шифрование при хранении (AES-256)</li>
              <li>Регулярное резервное копирование</li>
              <li>Разграничение доступа</li>
            </ul>
          </section>

          <section className="border-t pt-8">
            <h2 className="text-xl font-semibold mb-4">Контакты</h2>
            <ul className="list-none space-y-1">
              <li><strong>Email:</strong> privacy@flatro.app</li>
              <li><strong>DPO:</strong> dpo@flatro.app</li>
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
