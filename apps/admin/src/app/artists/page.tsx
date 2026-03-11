import Link from 'next/link';

export default function ArtistsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">아티스트</h1>
        <Link
          href="/artists/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          새 아티스트 등록
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow">
        <p className="p-8 text-center text-gray-500">
          등록된 아티스트가 없습니다
        </p>
      </div>
    </div>
  );
}
