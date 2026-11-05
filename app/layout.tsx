import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'GRE 筆記本',description:'保留每一步思考。可編輯的 Quan 與 Verbal 錯題筆記。'};
export const viewport: Viewport = {width:'device-width',initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body>{children}</body></html>;}
