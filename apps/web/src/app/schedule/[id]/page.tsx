import type { Metadata } from "next";
import type { Performance } from "@ipchun/shared";
import ScheduleDetail from "./ScheduleDetail";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Props {
  params: Promise<{ id: string }>;
}

async function fetchPerformance(id: string): Promise<Performance | null> {
  try {
    const res = await fetch(`${API_BASE}/performances/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const performance = await fetchPerformance(id);

  if (!performance) return { title: "공연 정보" };

  const title = performance.title;
  const description =
    performance.description ||
    (performance.venue?.name
      ? `${performance.venue.name}에서 열리는 ${title}`
      : `${title} 공연 정보`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(performance.posterUrl && {
        images: [{ url: performance.posterUrl }],
      }),
    },
    alternates: {
      canonical: `/schedule/${id}`,
    },
  };
}

export default async function ScheduleDetailPage({ params }: Props) {
  const { id } = await params;
  const performance = await fetchPerformance(id);

  if (!performance) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        공연을 찾을 수 없습니다
      </div>
    );
  }

  return <ScheduleDetail performance={performance} />;
}
