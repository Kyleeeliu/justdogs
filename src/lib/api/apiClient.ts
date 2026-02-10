import { supabase } from '@/lib/supabase/client';
import { AuthRecovery } from '@/lib/auth/authRecovery';
import { isRefreshTokenError } from '@/lib/auth/auth';

<<<<<<< Updated upstream
/**
 * Enhanced fetch wrapper that handles authentication errors automatically
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error in authenticatedFetch:', sessionError);
      if (isRefreshTokenError(sessionError)) {
        await AuthRecovery.handleAuthError(sessionError, 'authenticatedFetch');
        throw new Error('Session expired, redirecting to login');
      }
      throw sessionError;
    }
    
    if (!session) {
      throw new Error('No active session');
    }
    
    // Add authorization header
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    };
    
    // Make the request
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // Check for auth errors in response
=======
import { supabase } from '@/lib/supabase/client';

export async function authenticatedFetch(url: string, options: any = {}) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const defaultOptions = {
      ...options,
      credentials: 'include' as RequestCredentials,
      headers,
    };

    const response = await fetch(url, defaultOptions);

>>>>>>> Stashed changes
    if (response.status === 401) {
      console.warn('Received 401 response, attempting token refresh');
      
      try {
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('Token refresh failed:', refreshError);
          if (isRefreshTokenError(refreshError)) {
            await AuthRecovery.handleAuthError(refreshError, 'authenticatedFetch 401 refresh');
            throw new Error('Session expired, redirecting to login');
          }
          throw new Error('Failed to refresh session');
        }
        
        // Retry the request with new token
        const retryHeaders = {
          ...headers,
          'Authorization': `Bearer ${refreshData.session.access_token}`,
        };
        
        const retryResponse = await fetch(url, {
          ...options,
          headers: retryHeaders,
        });
        
        return retryResponse;
        
      } catch (refreshError) {
        console.error('Error during token refresh:', refreshError);
        if (isRefreshTokenError(refreshError)) {
          await AuthRecovery.handleAuthError(refreshError, 'authenticatedFetch retry');
          throw new Error('Session expired, redirecting to login');
        }
        throw refreshError;
      }
    }
    
    return response;
    
  } catch (error) {
    console.error('Error in authenticatedFetch:', error);
    
    // Handle refresh token errors
    if (isRefreshTokenError(error)) {
      await AuthRecovery.handleAuthError(error, 'authenticatedFetch catch');
      throw new Error('Session expired, redirecting to login');
    }
    
    throw error;
  }
}

/**
 * Wrapper for GET requests with authentication
 */
export async function authenticatedGet(url: string): Promise<Response> {
  return authenticatedFetch(url, { method: 'GET' });
}

/**
 * Wrapper for POST requests with authentication
 */
export async function authenticatedPost(url: string, data?: any): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Wrapper for PUT requests with authentication
 */
export async function authenticatedPut(url: string, data?: any): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Wrapper for DELETE requests with authentication
 */
export async function authenticatedDelete(url: string): Promise<Response> {
  return authenticatedFetch(url, { method: 'DELETE' });
}

/**
 * Helper to handle API responses with error checking
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // If not JSON, use the text as error message
      errorMessage = errorText || errorMessage;
    }
    
    throw new Error(errorMessage);
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return response.text() as any;
}

/**
 * Complete API call with authentication and error handling
 */
export async function apiCall<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await authenticatedFetch(url, options);
  return handleApiResponse<T>(response);
}