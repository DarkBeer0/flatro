// app/page.tsx
// Flatro — Landing Page (V8)

import Link from 'next/link'
import {
  Building2,
  Users,
  CreditCard,
  FileText,
  BarChart3,
  Bell,
  Shield,
  ArrowRight,
  Check,
  ChevronDown,
  Zap,
  Crown,
  ClipboardList,
  UserPlus,
  Rocket,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLANS } from '@/lib/subscription'

// ════════════════════════════════════════════════════════════════════
// Landing Page
// ════════════════════════════════════════════════════════════════════

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-blue-600" />
            <span className="text-xl font-bold tracking-tight">Flatro</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">
              Возможности
            </a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">
              Цены
            </a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
              Как это работает
            </a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-600">
                Войти
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Начать бесплатно
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 via-white to-white pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-blue-100/80 text-blue-700 text-xs font-semibold tracking-wide">
              <Zap className="h-3.5 w-3.5" />
              Бесплатно до 3 объектов — без кредитной карты
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-slate-900">
              Управляйте арендой
              <span className="block text-blue-600">без хаоса и таблиц</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Flatro — платформа для арендодателей в Польше. Недвижимость, арендаторы, платежи,
              договоры и счета за медиа — всё в одном месте. Экономьте до 5 часов в неделю.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-base px-8 h-12 shadow-lg shadow-blue-600/20"
                >
                  Создать аккаунт бесплатно
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-base px-8 h-12 border-slate-300 text-slate-700"
                >
                  У меня есть аккаунт
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <p className="mt-8 text-sm text-slate-400">
              Присоединяйтесь к арендодателям, которые уже управляют
              недвижимостью через Flatro
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-20 lg:py-28 bg-slate-50/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Всё, что нужно арендодателю
            </h2>
            <p className="mt-4 text-slate-500 text-lg">
              Шесть ключевых инструментов, которые заменят вам папку с бумагами и десять таблиц
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Building2 className="h-5 w-5" />}
              title="Учёт недвижимости"
              description="Все квартиры и дома в едином каталоге: адреса, площади, фото, статусы и история."
            />
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="База арендаторов"
              description="Контакты, документы, привязка к объектам и полная история взаимодействий."
            />
            <FeatureCard
              icon={<CreditCard className="h-5 w-5" />}
              title="Контроль платежей"
              description="Автоматическое отслеживание оплаты, напоминания и история транзакций."
            />
            <FeatureCard
              icon={<FileText className="h-5 w-5" />}
              title="Договоры"
              description="Управление договорами najmu с уведомлениями об окончании срока."
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Отчёты и аналитика"
              description="Доходность объектов, сводные отчёты и экспорт данных для бухгалтерии."
            />
            <FeatureCard
              icon={<Bell className="h-5 w-5" />}
              title="Уведомления"
              description="Email-уведомления о просрочках, окончании договоров и новых заявках."
            />
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Три шага — и вы работаете
            </h2>
            <p className="mt-4 text-slate-500 text-lg">
              Начните управлять арендой за 5 минут. Без обучения и настроек.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <StepCard
              number={1}
              icon={<UserPlus className="h-6 w-6" />}
              title="Создайте аккаунт"
              description="Бесплатная регистрация без кредитной карты. Занимает 30 секунд."
            />
            <StepCard
              number={2}
              icon={<ClipboardList className="h-6 w-6" />}
              title="Добавьте объекты"
              description="Внесите свои квартиры, арендаторов и текущие договоры."
            />
            <StepCard
              number={3}
              icon={<Rocket className="h-6 w-6" />}
              title="Управляйте"
              description="Принимайте платежи, отправляйте напоминания и следите за аналитикой."
            />
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 lg:py-28 bg-slate-50/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Прозрачные цены
            </h2>
            <p className="mt-4 text-slate-500 text-lg">
              Начните бесплатно. Переходите на PRO, когда будете готовы.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {/* FREE */}
            <PricingCard
              planKey="FREE"
              name={PLANS.FREE.name}
              description="Для начинающих арендодателей"
              price={PLANS.FREE.monthlyPricePLN}
              features={[
                `До ${PLANS.FREE.maxProperties} объектов`,
                'Управление арендаторами',
                'Базовые отчёты',
                'Сообщения',
              ]}
              highlighted={false}
              ctaText="Начать бесплатно"
              ctaHref="/register"
            />

            {/* PRO */}
            <PricingCard
              planKey="PRO"
              name={PLANS.PRO.name}
              description="Для активных арендодателей"
              price={PLANS.PRO.monthlyPricePLN}
              yearlyPrice={PLANS.PRO.yearlyPricePLN}
              features={[
                `До ${PLANS.PRO.maxProperties} объектов`,
                'Расчёт медиа (вода, газ, электричество)',
                'Управление заявками',
                'Email-уведомления',
                'Приоритетная поддержка',
              ]}
              highlighted={true}
              ctaText="Выбрать PRO"
              ctaHref="/register"
            />

            {/* BUSINESS */}
            <PricingCard
              planKey="BUSINESS"
              name={PLANS.BUSINESS.name}
              description="Для компаний и управляющих"
              price={PLANS.BUSINESS.monthlyPricePLN}
              yearlyPrice={PLANS.BUSINESS.yearlyPricePLN}
              features={[
                'Без ограничений по объектам',
                'Расширенная аналитика',
                'Доступ к API',
                'Персональный менеджер',
                'White-label опции',
              ]}
              highlighted={false}
              ctaText="Выбрать Business"
              ctaHref="/register"
            />
          </div>

          <p className="text-center text-sm text-slate-400 mt-8">
            Все цены указаны в PLN, нетто. Оплата через Stripe. Отмена в любой момент.
          </p>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Частые вопросы
            </h2>
          </div>

          <div className="space-y-4">
            <FaqItem
              question="Flatro действительно бесплатен?"
              answer="Да. План Free позволяет управлять до 3 объектами без ограничения по времени и без необходимости привязывать карту. Обновитесь до PRO или Business, когда будете готовы."
            />
            <FaqItem
              question="Подходит ли Flatro для польского рынка аренды?"
              answer="Абсолютно. Flatro создан с учётом польского законодательства — поддержка najem okazjonalny, расчёт медиа (woda, prąd, gaz), и интеграция с польскими платёжными системами через Stripe."
            />
            <FaqItem
              question="Безопасны ли мои данные?"
              answer="Данные хранятся на защищённых серверах с шифрованием. Платёжные данные обрабатываются Stripe и никогда не попадают на наши серверы. Регулярные резервные копии обеспечивают сохранность информации."
            />
            <FaqItem
              question="Могу ли я перейти на другой план в любой момент?"
              answer="Да. Вы можете обновить план в настройках аккаунта. При переходе на более дорогой план разница рассчитывается пропорционально. Отменить подписку можно в любой момент."
            />
            <FaqItem
              question="На каких языках доступен Flatro?"
              answer="Flatro поддерживает несколько языков, включая польский, английский и русский. Интерфейс автоматически переключается в зависимости от настроек вашего профиля."
            />
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────── */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Готовы навести порядок в аренде?
          </h2>
          <p className="mt-4 text-blue-100 text-lg">
            Присоединяйтесь к Flatro — это бесплатно, быстро и просто.
          </p>
          <div className="mt-8">
            <Link href="/register">
              <Button
                size="lg"
                variant="secondary"
                className="text-base px-8 h-12 font-semibold"
              >
                Создать аккаунт
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="py-12 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link href="/" className="flex items-center gap-2.5 mb-3">
                <Building2 className="h-6 w-6 text-blue-600" />
                <span className="text-lg font-bold">Flatro</span>
              </Link>
              <p className="text-sm text-slate-500 leading-relaxed">
                Современная платформа для управления арендой недвижимости в Польше.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Продукт</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <a href="#features" className="hover:text-blue-600 transition-colors">
                    Возможности
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-blue-600 transition-colors">
                    Цены
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-blue-600 transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Документы</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <Link href="/privacy" className="hover:text-blue-600 transition-colors">
                    Политика конфиденциальности
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-blue-600 transition-colors">
                    Условия использования
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Контакт</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <a
                    href="mailto:support@flatro.pl"
                    className="hover:text-blue-600 transition-colors"
                  >
                    support@flatro.pl
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} Flatro. Все права защищены.
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Shield className="h-3.5 w-3.5" />
              <span>Платежи защищены Stripe</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════════════

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-blue-200 hover:shadow-lg hover:shadow-blue-600/5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  )
}

function StepCard({
  number,
  icon,
  title,
  description,
}: {
  number: number
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="relative text-center">
      {/* Number badge */}
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
        {icon}
      </div>
      <span className="absolute -top-2 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
        {number}
      </span>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">{description}</p>
    </div>
  )
}

function PricingCard({
  planKey,
  name,
  description,
  price,
  yearlyPrice,
  features,
  highlighted,
  ctaText,
  ctaHref,
}: {
  planKey: string
  name: string
  description: string
  price: number
  yearlyPrice?: number
  features: string[]
  highlighted: boolean
  ctaText: string
  ctaHref: string
}) {
  return (
    <div
      className={`relative rounded-2xl border p-6 lg:p-8 flex flex-col ${
        highlighted
          ? 'border-blue-600 bg-white shadow-xl shadow-blue-600/10 ring-1 ring-blue-600'
          : 'border-slate-200 bg-white'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
            <Zap className="h-3 w-3" />
            Популярный
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900">{name}</h3>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-slate-900">
            {price === 0 ? '0' : price}
          </span>
          <span className="text-slate-500 text-sm font-medium">
            {price === 0 ? 'zł' : 'zł / мес'}
          </span>
        </div>
        {yearlyPrice !== undefined && yearlyPrice > 0 && (
          <p className="text-xs text-slate-400 mt-1">
            или {yearlyPrice} zł/год (экономия{' '}
            {Math.round(100 - (yearlyPrice / (price * 12)) * 100)}%)
          </p>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600">
            <Check
              className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                highlighted ? 'text-blue-600' : 'text-slate-400'
              }`}
            />
            {feature}
          </li>
        ))}
      </ul>

      <Link href={ctaHref} className="mt-auto">
        <Button
          className={`w-full h-11 font-semibold ${
            highlighted
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-slate-900 hover:bg-slate-800 text-white'
          }`}
        >
          {ctaText}
        </Button>
      </Link>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white overflow-hidden">
      <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors [&::-webkit-details-marker]:hidden list-none">
        {question}
        <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180 flex-shrink-0 ml-4" />
      </summary>
      <div className="px-6 pb-4 text-sm text-slate-500 leading-relaxed">{answer}</div>
    </details>
  )
}