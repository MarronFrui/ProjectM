interface ImportMetaEnv {
    readonly VITE_API_URL: string
    readonly VITE_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare module "plyr" {
    export default class Plyr {
        constructor(element: HTMLVideoElement, options?: any);
        destroy(): void;
        source: {
            type: string;
            sources: { src: string; type: string }[];
            tracks?: { kind: string; label: string; srclang: string; src: string }[];
        };
        on(event: string, callback: (e: any) => void): void;
        off(event: string, callback: (e: any) => void): void;
    }
}