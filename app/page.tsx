// app/page.tsx
import Link from 'next/link'
import { Building2, CheckCircle, CreditCard, FileText, Users, ArrowRight, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Flatro</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Войти</Button>
            </Link>
            <Link href="/register">
              <Button>Регистрация</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Управляйте арендой{' '}
              <span className="text-blue-600">просто и эффективно</span>
            </h1>
            <p className="text-lg lg:text-xl text-gray-600 mb-8">
              Flatro — современное приложение для арендодателей. 
              Учёт недвижимости, жильцов, платежей и договоров в одном месте.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Начать бесплатно
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  У меня есть аккаунт
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 mb-12">
            Всё что нужно для управления арендой
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Building2 className="h-6 w-6" />}
              title="Недвижимость"
              description="Учёт всех ваших квартир и домов с подробной информацией"
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Арендаторы"
              description="База данных жильцов с контактами и историей"
            />
            <FeatureCard
              icon={<CreditCard className="h-6 w-6" />}
              title="Платежи"
              description="Отслеживание оплаты, напоминания о просрочках"
            />
            <FeatureCard
              icon={<FileText className="h-6 w-6" />}
              title="Договоры"
              description="Управление договорами с уведомлениями об истечении"
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 mb-12">
              Почему Flatro?
            </h2>
            <div className="space-y-4">
              <BenefitItem text="Бесплатно для старта — до 3 объектов без оплаты" />
              <BenefitItem text="Работает на телефоне и компьютере" />
              <BenefitItem text="Данные в безопасности — шифрование и резервные копии" />
              <BenefitItem text="Поддержка нескольких языков" />
              <BenefitItem text="Соответствует польскому законодательству (najem okazjonalny)" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
            Готовы упростить управление арендой?
          </h2>
          <p className="text-blue-100 mb-8">
            Присоединяйтесь к Flatro сегодня — это бесплатно!
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary">
              Создать аккаунт
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              <span className="font-semibold text-gray-900">Flatro</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2026 Flatro. Все права защищены.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all">
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  )
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
      <span className="text-gray-700">{text}</span>
    </div>
  )
}
