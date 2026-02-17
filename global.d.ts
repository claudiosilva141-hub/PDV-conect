declare module 'lucide-react';
declare module 'recharts';
declare module 'react-router-dom';
declare module '*.png';
declare module '*.webp';

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly PROD: boolean;
    readonly DEV: boolean;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
