import type { Metadata } from "next";
import ScheduleDetail from "./ScheduleDetail";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${API_BASE}/performances/${id}`);
    if (!res.ok) return { title: "공연 정보" };

    const performance = await res.json();
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
  } catch {
    return { title: "공연 정보" };
  }
}

export default function ScheduleDetailPage() {
  return <ScheduleDetail />;
}
