import { supabase } from '@/lib/supabase/client';

export async function authenticatedFetch(url: string, options: any = {}) {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error in authenticatedFetch:', sessionError);
      throw sessionError;
    }
    
    if (!session) {
      throw new Error('No active session');
    }

    // Build headers with authorization
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...(options.headers || {}),
    };

    const defaultOptions = {
      ...options,
      credentials: 'include' as RequestCredentials,
      headers,
    };

    const response = await fetch(url, defaultOptions);

    // Handle 401 - try to refresh token
    if (response.status === 401) {
      console.warn("API returned 401. Attempting to refresh session...");
      
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Session expired, please log in again');
      }
      
      // Retry with new token
      const retryHeaders = {
        ...headers,
        'Authorization': `Bearer ${refreshData.session.access_token}`,
      };
      
      return await fetch(url, {
        ...options,
        credentials: 'include' as RequestCredentials,
        headers: retryHeaders,
      });
    }

    return response;
    
  } catch (error) {
    console.error('Error in authenticatedFetch:', error);
    throw error;
  }
}

export async function authenticatedGet(url: string): Promise<Response> {
  return authenticatedFetch(url, { method: 'GET' });
}

export async function authenticatedPost(url: string, data?: any): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function authenticatedPut(url: string, data?: any): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function authenticatedDelete(url: string): Promise<Response> {
  return authenticatedFetch(url, { method: 'DELETE' });
}