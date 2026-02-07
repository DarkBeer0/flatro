// middleware.ts (в корне проекта)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Публичные пути (не требуют авторизации)
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/register/confirm',
  '/forgot-password',
  '/auth/callback',
  '/reset-password',
  '/privacy',
  '/terms',
]
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Быстрый выход для API (авторизация проверяется в самих route handlers)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => 
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // КРИТИЧНО: используем getUser(), а не getSession()
  // getSession() не валидирует токен с сервером Supabase
  const { data: { user }, error } = await supabase.auth.getUser()

  // Логируем ошибки auth (но не блокируем)
  if (error && !error.message.includes('no session') && !error.message.includes('invalid claim')) {
    console.error('[Middleware] Auth error:', error.message)
  }

  // === ROUTING LOGIC ===
  
  const isPublicPath = PUBLIC_PATHS.includes(pathname)
  const isInvitePath = pathname.startsWith('/invite/')
  const isAuthPath = pathname === '/login' || pathname === '/register'

  // Пользователь НЕ авторизован
  if (!user) {
    // Разрешаем публичные пути и приглашения
    if (isPublicPath || isInvitePath) {
      return supabaseResponse
    }
    
    // Сохраняем intended URL для редиректа после логина
    const url = request.nextUrl.clone()
    const intendedPath = pathname + request.nextUrl.search
    url.pathname = '/login'
    
    // Добавляем redirect param только для значимых путей
    if (pathname !== '/dashboard' && pathname !== '/tenant/dashboard') {
      url.searchParams.set('redirect', intendedPath)
    }
    
    return NextResponse.redirect(url)
  }

  // Пользователь АВТОРИЗОВАН

  // Приглашения — всегда пропускаем
  if (isInvitePath) {
    return supabaseResponse
  }

  // Авторизованный на странице логина/регистрации
  if (isAuthPath) {
    // Проверяем invite параметр
    const inviteParam = request.nextUrl.searchParams.get('invite')
    if (inviteParam) {
      const url = request.nextUrl.clone()
      url.pathname = `/invite/${inviteParam}`
      url.search = ''
      return NextResponse.redirect(url)
    }

    // Проверяем redirect параметр
    const redirectPath = request.nextUrl.searchParams.get('redirect')
    const url = request.nextUrl.clone()
    url.pathname = redirectPath || '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Разрешаем все остальные пути
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - public folder files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}