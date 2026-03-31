'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PerformanceForm } from '../components/performance-form';

export default function NewPerformancePage() {
  const router = useRouter();

  async function handleSubmit(data: Record<string, unknown>) {
    const created = await api.performances.create(data);
    return created.id;
  }

  function handleSuccess() {
    router.push('/performances');
  }

  async function handleFetch(url: string) {
    return api.performances.fetch(url);
  }

  return (
    <div>
      <h1 className="page-heading mb-8">새 공연 등록</h1>
      <PerformanceForm mode="create" onSubmit={handleSubmit} onSuccess={handleSuccess} onFetch={handleFetch} />
    </div>
  );
}
