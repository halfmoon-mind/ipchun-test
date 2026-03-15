export default function DashboardPage() {
  return (
    <div>
      <h1 className="page-heading mb-8">대시보드</h1>
      <div className="grid grid-cols-3 gap-5">
        <div className="card p-6">
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            아티스트
          </p>
          <p className="text-[32px] font-bold mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            0
          </p>
        </div>
        <div className="card p-6">
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            일정
          </p>
          <p className="text-[32px] font-bold mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            0
          </p>
        </div>
        <div className="card p-6">
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            카드뉴스
          </p>
          <p className="text-[32px] font-bold mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            0
          </p>
        </div>
      </div>
    </div>
  );
}
