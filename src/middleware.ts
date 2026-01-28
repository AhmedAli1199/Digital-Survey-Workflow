import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Refresh Session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname;

  // 2. Allow Public Routes
  // - Auth pages must be public to avoid redirect loops.
  // - Static/binary assets must bypass middleware to avoid accidental processing.
  const isPublicRoute =
    path.startsWith('/login') ||
    path.startsWith('/auth')

  const isStaticOrBinary =
    path.startsWith('/_next') ||
    path.startsWith('/static') ||
    path.includes('.') // Extensions like .ico, .png, .css

  if (isPublicRoute || isStaticOrBinary) {
    // If user is already logged in and tries to go to /login, only redirect
    // if their profile/license is valid; otherwise allow /login so the user
    // can see the error and sign out.
    if (user && path.startsWith('/login')) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('license_status')
        .eq('id', user.id)
        .maybeSingle();

      if (!profileError && profile?.license_status === 'active') {
        return NextResponse.redirect(new URL('/surveys', request.url))
      }
    }
    return response
  }

  // 3. Block Unauthenticated
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 4. Check Profile & Role (Security Check)
  // We fetch the profile securely from DB
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, license_status, company_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    const deniedUrl = new URL('/login', request.url)
    deniedUrl.searchParams.set(
      'error',
      profileError
        ? `Profile lookup failed: ${profileError.message}`
        : 'Account profile missing. Ensure public.profiles.id equals auth.users.id (UUID).'
    )
    return NextResponse.redirect(deniedUrl)
  }

  // 4a. License Revocation Check
  if (profile.license_status !== 'active') {
    // Force logout or show error page
    // For now, redirect to a generic 'Access Denied' page or login
    const deniedUrl = new URL('/login', request.url)
    deniedUrl.searchParams.set('error', 'License Revoked or Pending Approval')
    return NextResponse.redirect(deniedUrl)
  }

  // 4b. Admin-only routes
  if (path.startsWith('/admin') && profile.role !== 'admin') {
    return NextResponse.redirect(new URL('/surveys', request.url))
  }

  // 5. Inject Identity Headers
  // These headers are trusted by the application because they come from Middleware
  response.headers.set('x-user-id', user.id) // Secure User ID
  response.headers.set('x-user-role', profile.role || 'client') // Secure Role
  response.headers.set('x-user-company', profile.company_name || 'Unknown') // For Watermarks

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
