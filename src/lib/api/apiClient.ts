import { supabase } from '@/lib/supabase/client';
import { AuthRecovery } from '@/lib/auth/authRecovery';

export async function authenticatedFetch(
  url: string,
  options: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> } = {}
) {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error in authenticatedFetch:', sessionError);
      if (AuthRecovery.shouldRecover(sessionError)) {
        await AuthRecovery.clearAndRedirect();
        throw new Error('Session expired');
      }
      throw sessionError;
    }

    if (!session) {
      throw new Error('No active session');
    }

    const isFormData =
      typeof FormData !== 'undefined' && options.body instanceof FormData;

    // Build headers with authorization (omit Content-Type for FormData so browser sets multipart boundary)
    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers || {}),
    };
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (isFormData) {
      delete headers['Content-Type'];
    }

    const defaultOptions = {
      ...options,
      credentials: 'include' as RequestCredentials,
      headers,
    };

    const response = await fetch(url, defaultOptions);

    // Handle 401 - try to refresh token
    if (response.status === 401) {
      console.warn("API returned 401. Attempting to refresh session...");

      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          if (AuthRecovery.shouldRecover(refreshError)) {
            await AuthRecovery.clearAndRedirect();
            throw new Error('Session expired');
          }
          console.error('Token refresh failed:', refreshError);
          throw new Error('Session expired, please log in again');
        }

        if (!refreshData.session) {
          throw new Error('Session expired, please log in again');
        }

        // Retry with new token
        const retryIsFormData =
          typeof FormData !== 'undefined' && options.body instanceof FormData;
        const retryHeaders: Record<string, string> = {
          Authorization: `Bearer ${refreshData.session.access_token}`,
          ...(options.headers || {}),
        };
        if (!retryIsFormData && !retryHeaders['Content-Type']) {
          retryHeaders['Content-Type'] = 'application/json';
        }
        if (retryIsFormData) {
          delete retryHeaders['Content-Type'];
        }

        const retryResponse = await fetch(url, {
          ...options,
          credentials: 'include' as RequestCredentials,
          headers: retryHeaders,
        });

        if (retryResponse.status === 401) {
          await AuthRecovery.clearAndRedirect();
          throw new Error('Session expired');
        }
        return retryResponse;
      } catch (refreshErr: unknown) {
        if (AuthRecovery.shouldRecover(refreshErr)) {
          await AuthRecovery.clearAndRedirect();
        }
        throw refreshErr;
      }
    }

    return response;
  } catch (error: unknown) {
    console.error('Error in authenticatedFetch:', error);
    if (AuthRecovery.shouldRecover(error)) {
      await AuthRecovery.clearAndRedirect();
    }
    throw error;
  }
}

export async function authenticatedGet(url: string): Promise<Response> {
  return authenticatedFetch(url, { method: 'GET' });
}

export async function authenticatedPost(url: string, data?: unknown): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function authenticatedPut(url: string, data?: unknown): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function authenticatedDelete(url: string): Promise<Response> {
  return authenticatedFetch(url, { method: 'DELETE' });
}