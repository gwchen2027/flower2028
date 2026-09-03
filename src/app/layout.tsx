import type { Metadata } from 'next';
import { Noto_Serif_SC } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  display: 'swap',
  variable: '--font-noto-serif',
});

export const metadata: Metadata = {
  title: '情书生成器 | 为你写下最真挚的情话',
  description: '输入收信人和写信人的名字，AI 将为你生成一封深情、专一、充满热情的表白信。让每一封情书都成为珍藏一生的礼物。',
  keywords: ['情书', '表白', '爱情信', '情话', '浪漫', 'AI情书'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSerifSC.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
