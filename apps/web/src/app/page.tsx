import { HomeContent } from "@/components/HomeContent";
import type { CalendarResponse } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;
  const selectedDate = params.date ?? null;

  const res = await fetch(
    `${API_BASE}/performances/calendar?year=${year}&month=${month}`,
  );
  const data: CalendarResponse = await res.json();

  return (
    <HomeContent
      initialData={data}
      year={year}
      month={month}
      selectedDate={selectedDate}
    />
  );
}
