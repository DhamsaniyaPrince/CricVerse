export const getSiteUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VITE_SITE_URL ||
    process.env.APP_BASE_URL ||
    'http://localhost:3000'
  );
};

export const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://process.env.NEXT_PUBLIC_API_URLgit status';
};
