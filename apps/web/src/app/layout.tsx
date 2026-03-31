import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ipchun.live"),
  title: {
    default: "입춘 — 인디 공연 일정",
    template: "%s | 입춘",
  },
  description: "인디 밴드·아티스트 공연 일정을 한눈에 확인하세요.",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "입춘",
    title: "입춘 — 인디 공연 일정",
    description: "인디 밴드·아티스트 공연 일정을 한눈에 확인하세요.",
  },
  twitter: {
    card: "summary_large_image",
    title: "입춘 — 인디 공연 일정",
    description: "인디 밴드·아티스트 공연 일정을 한눈에 확인하세요.",
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1A1A1A",
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
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&display=swap"
        />
      </head>
      <body className="min-h-dvh">
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="mx-auto max-w-lg px-4 py-3">
            <Link href="/">
              <h1
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                입춘
              </h1>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-lg pb-24">{children}</main>
      </body>
    </html>
  );
}
