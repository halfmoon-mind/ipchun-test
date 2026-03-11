import Link from 'next/link';

export default function SchedulesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">일정</h1>
        <Link
          href="/schedules/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          새 일정 등록
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow">
        <p className="p-8 text-center text-gray-500">
          등록된 일정이 없습니다
        </p>
      </div>
    </div>
  );
}
