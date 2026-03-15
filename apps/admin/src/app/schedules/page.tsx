import Link from 'next/link';

export default function SchedulesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-heading">일정</h1>
        <Link href="/schedules/new" className="btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          새 일정 등록
        </Link>
      </div>
      <div className="card">
        <p className="empty-state">
          등록된 일정이 없습니다
        </p>
      </div>
    </div>
  );
}
