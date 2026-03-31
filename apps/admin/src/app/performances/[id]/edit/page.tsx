'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PerformanceForm } from '../../components/performance-form';
import type { Performance } from '@ipchun/shared';

export default function EditPerformancePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.performances.get(id)
      .then(setPerformance)
      .catch(() => setError('공연 정보를 불러오는데 실패했습니다'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: Record<string, unknown>) {
    await api.performances.update(id, data);
  }

  function handleSuccess() {
    router.push(`/performances/${id}`);
  }

  if (loading) return <p style={{ color: 'var(--muted-foreground)' }}>불러오는 중...</p>;
  if (error) return <div className="alert-error">{error}</div>;
  if (!performance) return <div className="alert-error">공연을 찾을 수 없습니다</div>;

  return (
    <div>
      <h1 className="page-heading mb-8">공연 수정</h1>
      <PerformanceForm mode="edit" initialData={performance} onSubmit={handleSubmit} onSuccess={handleSuccess} />
    </div>
  );
}
