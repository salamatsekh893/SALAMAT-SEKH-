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
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  if (token) {
    defaultHeaders['X-Authorization'] = `Bearer ${token}`;
  }

  // Ensure leading slash for endpoint
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_URL}${cleanEndpoint}`;
  
  if (import.meta.env.DEV) {
    console.log(`[API FETCH] ${fullUrl}`);
  }

  const response = await fetch(fullUrl, {
    cache: 'no-store',
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return new Promise(() => {});
    }
    
    const text = await response.text();
    
    // Silence 429 and 403 errors in console to avoid AI studio flagging false positives from proxies
    if (response.status !== 429 && response.status !== 403) {
      console.error(`[API ERROR] ${fullUrl}: Status ${response.status}, Content-Type: ${contentType}, First 100 chars: ${text.substring(0, 100)}`);
    }
    
    try {
      if (isJson) {
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || `Error ${response.status}`);
      } else {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait a moment.");
        }
        if (response.status === 403) {
          throw new Error("Access forbidden. You might not have the required permissions.");
        }
        throw new Error(`Server returned ${response.status} (${contentType || 'no content type'}). Check console for details.`);
      }
    } catch (e: any) {
      throw new Error(e.message || `Error ${response.status}`);
    }
  }

  if (!isJson) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please wait a moment.");
    }
    const text = await response.text();
    console.warn(`[API WARNING] Expected JSON from ${fullUrl} but got ${contentType}. Full HTML might be returned.`);
    
    // Check if it's returning the React app's index.html fallback (typical on shared hosting when node server crashes or route is missing)
    if (response.ok && text.includes('<html') && text.includes('<body')) {
       throw new Error(`সার্ভার থেকে সঠিক ডাটা পাওয়া যায়নি (200 OK with HTML)। এটি সাধারণত হয় যদি আপনার হোস্ট সার্ভার (Node.js) বন্ধ থাকে বা রুটটি কনফিগার করা না থাকে। দয়া করে সার্ভার রিস্টার্ট করুন।`);
    }

    throw new Error(`Invalid response format from server (${contentType}). Expected JSON.`);
  }

  return response.json();
};
