export const API_URL = (() => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '' && envUrl !== '/') {
    let url = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
    if (!url.startsWith('/') && !url.startsWith('http')) {
      url = '/' + url;
    }
    return url;
  }
  return '/api';
})();

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Ensure leading slash for endpoint
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_URL}${cleanEndpoint}`;
  
  if (import.meta.env.DEV) {
    console.log(`[API FETCH] ${fullUrl}`);
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return new Promise(() => {});
    }
    
    const text = await response.text();
    console.error(`[API ERROR] ${fullUrl}: Status ${response.status}, Content-Type: ${contentType}, First 100 chars: ${text.substring(0, 100)}`);
    
    try {
      if (isJson) {
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || `Error ${response.status}`);
      } else {
        throw new Error(`Server returned ${response.status} (${contentType || 'no content type'}). Check console for details.`);
      }
    } catch (e: any) {
      throw new Error(e.message || `Error ${response.status}`);
    }
  }

  if (!isJson) {
    const text = await response.text();
    console.warn(`[API WARNING] Expected JSON from ${fullUrl} but got ${contentType}. Full HTML might be returned.`);
    throw new Error(`Invalid response format from server (${contentType}). Expected JSON.`);
  }

  return response.json();
};
