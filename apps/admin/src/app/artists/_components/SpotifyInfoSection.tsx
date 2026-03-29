import type { SpotifyMeta } from '@ipchun/shared';

interface SpotifyInfoSectionProps {
  spotifyId: string;
  spotifyLink: string;
  monthlyListeners: number | null;
  spotifyMeta: SpotifyMeta | null;
}

export function SpotifyInfoSection({
  spotifyId,
  spotifyLink,
  monthlyListeners,
  spotifyMeta,
}: SpotifyInfoSectionProps) {
  return (
    <div
      className="p-4 space-y-4"
      style={{ background: 'var(--spotify-light)', border: '1px solid rgba(29, 185, 84, 0.12)' }}
    >
      <p className="text-[13px] font-semibold" style={{ color: 'var(--spotify)' }}>
        Spotify 정보
      </p>

      {/* 기본 정보 */}
      <div className="grid grid-cols-2 gap-3 text-[13px]">
        <div>
          <span style={{ color: 'var(--text-tertiary)' }}>Spotify ID</span>
          <p className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{spotifyId}</p>
        </div>
        <div>
          <span style={{ color: 'var(--text-tertiary)' }}>링크</span>
          <p className="mt-0.5">
            <a
              href={spotifyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
              style={{ color: 'var(--spotify)' }}
            >
              Spotify에서 보기
            </a>
          </p>
        </div>
      </div>

      {/* 수치 정보 */}
      {spotifyMeta && (
        <>
          <div className="grid grid-cols-3 gap-3 text-[13px]">
            {monthlyListeners != null && (
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>월간 리스너</span>
                <p className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  {monthlyListeners.toLocaleString()}
                </p>
              </div>
            )}
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>팔로워</span>
              <p className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                {spotifyMeta.followers.toLocaleString()}
              </p>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>인기도</span>
              <p className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                {spotifyMeta.popularity}/100
              </p>
            </div>
          </div>

          {/* 장르 */}
          {spotifyMeta.genres.length > 0 && (
            <div>
              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>장르</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {spotifyMeta.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-2 py-0.5 text-[12px]"
                    style={{ background: 'var(--spotify-light)', color: 'var(--spotify)' }}
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 인기 트랙 */}
          {spotifyMeta.topTracks.length > 0 && (
            <div>
              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>인기 트랙</span>
              <div className="mt-1 space-y-1">
                {spotifyMeta.topTracks.slice(0, 5).map((track, i) => (
                  <div key={i} className="flex items-center gap-2 text-[13px]">
                    <span className="w-5 text-right" style={{ color: 'var(--text-tertiary)' }}>{i + 1}</span>
                    {track.albumImageUrl && (
                      <img src={track.albumImageUrl} alt="" className="w-6 h-6 object-cover" />
                    )}
                    <span style={{ color: 'var(--text-primary)' }}>{track.name}</span>
                    <span className="ml-auto text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                      {track.albumName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 관련 아티스트 */}
          {spotifyMeta.relatedArtists.length > 0 && (
            <div>
              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>관련 아티스트</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {spotifyMeta.relatedArtists.slice(0, 8).map((ra) => (
                  <div key={ra.spotifyId} className="flex items-center gap-1.5 text-[12px]">
                    {ra.imageUrl && (
                      <img src={ra.imageUrl} alt="" className="w-5 h-5 object-cover" />
                    )}
                    <span style={{ color: 'var(--text-primary)' }}>{ra.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
