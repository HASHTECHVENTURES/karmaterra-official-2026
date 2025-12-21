// Centralized configuration management
// Environment variables with fallbacks

export const config = {
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  rapidApi: {
    key: import.meta.env.VITE_RAPIDAPI_KEY || '',
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'KarmaTerra',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
  },
} as const;

// Validation function to check if required env vars are set
export const validateConfig = () => {
  const warnings: string[] = [];

  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    warnings.push('VITE_GEMINI_API_KEY is not set, using fallback');
  }

  if (warnings.length > 0 && config.app.isDevelopment) {
    console.warn('Configuration warnings:', warnings);
  }

  return warnings.length === 0;
};

// Safe localStorage wrapper with error handling
export const storage = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error reading from localStorage: ${key}`, error);
      return null;
    }
  },
  
  set: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage: ${key}`, error);
      return false;
    }
  },
  
  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage: ${key}`, error);
      return false;
    }
  },
  
  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage', error);
      return false;
    }
  },
};

