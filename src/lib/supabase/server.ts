import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // This is expected when called from Server Components
            // but we log it for API route debugging
          }
        },
      },
    }
  );
}

export async function getServerUser() {
  try {
    const supabase = await createSupabaseServerClient();
    
    // getUser() is the secure way to verify the JWT on the server
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.warn('[Server] No user found in session');
      return null;
    }

    // Fetch profile role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[Server] Profile fetch error:', profileError.message);
    }

    return { 
      ...user, 
      role: profile?.role || 'parent' 
    };
  } catch (e) {
    console.error('[Server] Critical Auth Error:', e);
    return null;
  }
}