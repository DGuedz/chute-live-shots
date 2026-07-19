const DEFAULT_API_URL = 'http://127.0.0.1:8000';
const isProduction = Boolean((import.meta as ImportMeta & {env: {PROD?: boolean}}).env.PROD);

type AppEnv = {
  apiUrl: string;
  publicAppUrl: string;
  isProduction: boolean;
  bootError: string | null;
};

function normalizeAbsoluteUrl(value: string, label: string): string {
  try {
    const url = new URL(value);
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`${label} precisa ser uma URL absoluta válida.`);
  }
}

function resolveApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    return normalizeAbsoluteUrl(configured, 'VITE_API_URL');
  }
  if (isProduction) {
    throw new Error('VITE_API_URL é obrigatório em produção.');
  }
  return DEFAULT_API_URL;
}

function resolvePublicAppUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (configured) {
    return normalizeAbsoluteUrl(configured, 'VITE_PUBLIC_APP_URL');
  }
  if (isProduction) {
    throw new Error('VITE_PUBLIC_APP_URL é obrigatório em produção.');
  }
  return window.location.origin;
}

function createEnv(): AppEnv {
  try {
    return {
      apiUrl: resolveApiUrl(),
      publicAppUrl: resolvePublicAppUrl(),
      isProduction,
      bootError: null,
    };
  } catch (error) {
    return {
      apiUrl: DEFAULT_API_URL,
      publicAppUrl: window.location.origin,
      isProduction,
      bootError: error instanceof Error ? error.message : 'Falha ao validar as variáveis de ambiente.',
    };
  }
}

export const APP_ENV = createEnv();
