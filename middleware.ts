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
  const publicPaths = ['/', '/login', '/register', '/forgot-password', '/auth/callback']
  const isPublicPath = publicPaths.some(path => pathname === path)
  
  // Страница приглашения — доступна для всех
  const isInvitePath = pathname.startsWith('/invite/')
  
  // Пути для владельцев
  const ownerPaths = ['/dashboard', '/properties', '/tenants', '/payments', '/contracts', '/settings', '/messages', '/tickets']
  const isOwnerPath = ownerPaths.some(path => pathname.startsWith(path))
  
  // Пути для жильцов
  const tenantPaths = ['/tenant']
  const isTenantPath = tenantPaths.some(path => pathname.startsWith(path))

  // Если пользователь не авторизован
  if (!user) {
    // Разрешаем публичные пути и приглашения
    if (isPublicPath || isInvitePath) {
      return supabaseResponse
    }
    // Редирект на логин
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Пользователь авторизован
  
  // Если пытается зайти на логин/регистрацию — редирект
  if (pathname === '/login' || pathname === '/register') {
    const url = request.nextUrl.clone()
    // TODO: Определить роль и редиректить на нужный dashboard
    // Пока редиректим на /dashboard, там API определит роль
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Разрешаем все остальные пути для авторизованных
  // Роль проверяется на уровне страниц/API
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
