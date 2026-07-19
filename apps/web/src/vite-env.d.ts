interface Window { Telegram?: { WebApp: any } }
declare module '*.css';
interface ImportMetaEnv {
  readonly PROD: boolean
  readonly VITE_API_URL?: string
  readonly VITE_PUBLIC_APP_URL?: string
  readonly VITE_SOLANA_RPC_URL?: string
  readonly VITE_SOLANA_MAINNET_RPC_URL?: string
}
interface ImportMeta { readonly env: ImportMetaEnv }
