export const API_URL = import.meta.env.VITE_API_URL || '/api';

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return new Promise(() => {}); // Halt execution while browser redirects
    }
    
    const text = await response.text();
    try {
      const errorData = JSON.parse(text);
      throw new Error(errorData.error || `Error ${response.status}`);
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        throw new Error(`Error ${response.status}: ${text.substring(0, 50)}`);
      }
      throw e;
    }
  }

  return response.json();
};
