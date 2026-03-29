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
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="flex min-h-screen">
        <aside
          className="w-[260px] flex flex-col justify-between py-8 px-5"
          style={{ background: 'var(--sidebar-bg)' }}
        >
          <div>
            <div className="mb-10 px-3">
              <h1
                className="text-[17px] font-bold tracking-tight"
                style={{ color: 'var(--sidebar-accent)' }}
              >
                입춘
              </h1>
              <p
                className="text-[11px] mt-1 font-medium"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                인디 아티스트 관리
              </p>
            </div>
            <nav className="space-y-1">
              <Link
                href="/"
                className="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                대시보드
              </Link>
              <Link
                href="/artists"
                className="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                아티스트
              </Link>
              <Link
                href="/performances"
                className="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15.6 11.6L22 7v10l-6.4-4.6"/><rect x="2" y="7" width="14" height="10" rx="1"/></svg>
                공연
              </Link>
              <Link
                href="/schedules"
                className="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                일정
              </Link>
            </nav>
          </div>
          <p
            className="text-[10px] px-3"
            style={{ color: 'rgba(255,255,255,0.18)' }}
          >
            ipchun admin v0.1
          </p>
        </aside>
        <main
          className="flex-1 py-10 px-12 overflow-auto"
          style={{
            background: 'var(--background)',
            color: 'var(--text-primary)',
          }}
        >
          <div className="max-w-4xl" style={{ animation: 'fadeIn 0.25s ease-out' }}>
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
