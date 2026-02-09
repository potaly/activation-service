import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '激活服务',
  description: '软件激活验证服务',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
