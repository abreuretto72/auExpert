import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'auExpert · Admin',
  description: 'Painel administrativo do auExpert',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
