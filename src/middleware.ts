import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Check if an error is related to refresh token issues
 */
function isRefreshTokenError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message || error.toString();
  const errorName = error.name || '';
  
  return message.includes('refresh_token_not_found') ||
         message.includes('Invalid Refresh Token') ||
         message.includes('Refresh Token Not Found') ||
         message.includes('AuthApiError') ||
         errorName.includes('AuthApiError') ||
         (error.status === 400 && message.includes('refresh'));
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  try {
    // IMPORTANT: This refreshes the session cookie
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.warn('Middleware auth error:', error);
      
      // Handle refresh token errors by clearing cookies and redirecting
      if (isRefreshTokenError(error)) {
        console.log('Middleware: Invalid refresh token detected, clearing auth cookies');
        
        // Clear all Supabase auth cookies
        const cookiesToClear = [
          'sb-pajtampwqutuuidklxbv-auth-token',
          'sb-pajtampwqutuuidklxbv-auth-token.0',
          'sb-pajtampwqutuuidklxbv-auth-token.1',
          'sb-pajtampwqutuuidklxbv-auth-token.2',
          'sb-pajtampwqutuuidklxbv-auth-token.3',
          'sb-pajtampwqutuuidklxbv-auth-token.4',
          'sb-pajtampwqutuuidklxbv-auth-token.5',
          'sb-pajtampwqutuuidklxbv-auth-token.6',
          'sb-pajtampwqutuuidklxbv-auth-token.7'
        ];
        
        cookiesToClear.forEach(cookieName => {
          response.cookies.set({
            name: cookieName,
            value: '',
            expires: new Date(0),
            path: '/',
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          });
        });
        
        // If user is trying to access a protected route, redirect to login
        const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                                request.nextUrl.pathname.startsWith('/admin') ||
                                request.nextUrl.pathname.startsWith('/profile') ||
                                request.nextUrl.pathname.startsWith('/bookings-sessions') ||
                                request.nextUrl.pathname.startsWith('/dogs') ||
                                request.nextUrl.pathname.startsWith('/messages') ||
                                request.nextUrl.pathname.startsWith('/trainer-availability');
        
        if (isProtectedRoute) {
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('message', 'session_expired');
          return NextResponse.redirect(loginUrl);
        }
      }
    }
  } catch (error) {
    console.error('Middleware error:', error);
    
    // Handle any unexpected errors that might be refresh token related
    if (isRefreshTokenError(error)) {
      console.log('Middleware: Unexpected refresh token error, clearing auth cookies');
      
      // Clear auth cookies
      response.cookies.set({
        name: 'sb-pajtampwqutuuidklxbv-auth-token',
        value: '',
        expires: new Date(0),
        path: '/'
      });
      
      // Redirect to login if accessing protected routes
      const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                              request.nextUrl.pathname.startsWith('/admin');
      
      if (isProtectedRoute) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('message', 'session_expired');
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};

