import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource/federo/400.css';
import '@fontsource/jetbrains-mono/500.css';
import { themeInitScript } from '@/shared/hooks/useThemeMode';
import './globals.css';

export const metadata: Metadata = {
  title: '만다라트 노트',
  description: '핵심 목표 하나를 세부 목표 8개와 실천 항목 64개로 펼쳐 쓰는 만다라트 작성 도구',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F6F1' },
    { media: '(prefers-color-scheme: dark)', color: '#0D1512' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 첫 페인트 전에 낮/밤 테마를 적용해 깜빡임을 막는다 */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
