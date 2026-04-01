interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_API_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare module "plyr" {
    export default class Plyr {
        constructor(element: HTMLVideoElement, options?: any);
        destroy(): void;
    }
}