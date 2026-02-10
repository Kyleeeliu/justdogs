// src/lib/api/apiClient.ts

export async function authenticatedFetch(url: string, options: any = {}) {
  try {
    const defaultOptions = {
      ...options,
      credentials: 'include' as RequestCredentials, 
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };
    
    const response = await fetch(url, defaultOptions);

    // If the server returns a 401, it means the cookies we sent were rejected
    if (response.status === 401) {
      console.warn("API returned 401. Session might be expired.");
    }

    return response;
  } catch (error) {
    console.error("Network error during authenticatedFetch:", error);
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