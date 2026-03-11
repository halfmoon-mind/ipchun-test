import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ipchun Admin',
  description: '인디 아티스트 관리 도구',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen">
        <aside className="w-64 bg-gray-900 text-white p-6">
          <h1 className="text-xl font-bold mb-8">ipchun Admin</h1>
          <nav className="space-y-2">
            <Link
              href="/"
              className="block px-4 py-2 rounded hover:bg-gray-800"
            >
              대시보드
            </Link>
            <Link
              href="/artists"
              className="block px-4 py-2 rounded hover:bg-gray-800"
            >
              아티스트
            </Link>
            <Link
              href="/schedules"
              className="block px-4 py-2 rounded hover:bg-gray-800"
            >
              일정
            </Link>
          </nav>
        </aside>
        <main className="flex-1 p-8 bg-gray-50">{children}</main>
      </body>
    </html>
  );
}
