// middleware.ts (в корне проекта)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Публичные пути (не требуют авторизации)
  const publicPaths = ['/', '/login', '/register', '/forgot-password', '/auth/callback', '/reset-password']
  const isPublicPath = publicPaths.some(path => pathname === path)
  
  // Страница приглашения — доступна для ВСЕХ (и авторизованных, и нет)
  const isInvitePath = pathname.startsWith('/invite/')

  // API пути — пропускаем (авторизация проверяется в самих API)
  const isApiPath = pathname.startsWith('/api/')

  // Если пользователь НЕ авторизован
  if (!user) {
    // Разрешаем публичные пути, приглашения и API
    if (isPublicPath || isInvitePath || isApiPath) {
      return supabaseResponse
    }
    // Редирект на логин
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Пользователь АВТОРИЗОВАН

  // Приглашения — всегда пропускаем (авторизованный тоже может принять invite)
  if (isInvitePath) {
    return supabaseResponse
  }

  // Если пытается зайти на логин/регистрацию — редирект на dashboard
  if (pathname === '/login' || pathname === '/register') {
    // Проверяем нет ли invite параметра
    const inviteParam = request.nextUrl.searchParams.get('invite')
    if (inviteParam) {
      // Если есть invite — перенаправляем на страницу приглашения
      const url = request.nextUrl.clone()
      url.pathname = `/invite/${inviteParam}`
      url.search = ''
      return NextResponse.redirect(url)
    }

    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Разрешаем все остальные пути для авторизованных
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}