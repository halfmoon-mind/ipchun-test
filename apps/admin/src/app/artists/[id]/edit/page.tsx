'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function EditArtistPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spotifyUrl, setSpotifyUrl] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [spotifyLink, setSpotifyLink] = useState('');
  const [socialLinks, setSocialLinks] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    api.artists.get(id).then((artist) => {
      setName(artist.name);
      setDescription(artist.description || '');
      setImageUrl(artist.imageUrl || '');
      setSpotifyId(artist.spotifyId || '');
      setSpotifyLink(artist.spotifyUrl || '');
      setSpotifyUrl(artist.spotifyUrl || '');
      if (artist.socialLinks) {
        setSocialLinks(
          Object.entries(artist.socialLinks).map(([key, value]) => ({ key, value })),
        );
      }
    }).catch(() => {
      setError('아티스트 정보를 불러오는데 실패했습니다');
    }).finally(() => setFetching(false));
  }, [id]);

  function extractSpotifyId(url: string): string | null {
    const match = url.match(/artist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  async function handleSpotifyFetch() {
    const sid = extractSpotifyId(spotifyUrl);
    if (!sid) {
      setError('올바른 Spotify 아티스트 URL을 입력해주세요.');
      return;
    }

    setSpotifyLoading(true);
    setError(null);
    try {
      const data = await api.spotify.getArtist(sid);
      setName(data.name);
      setImageUrl(data.imageUrl || '');
      setSpotifyId(data.spotifyId);
      setSpotifyLink(data.spotifyUrl);

      // YouTube 채널 자동 검색
      const youtube = await api.youtube.searchChannel(data.name);

      setSocialLinks((prev) => {
        const filtered = prev.filter((l) => l.key !== 'spotify' && l.key !== 'youtube');
        const links = [{ key: 'spotify', value: data.spotifyUrl }];
        if (youtube?.channelUrl) {
          links.push({ key: 'youtube', value: youtube.channelUrl });
        }
        return [...links, ...filtered];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spotify 정보를 가져오는데 실패했습니다');
    } finally {
      setSpotifyLoading(false);
    }
  }

  function addSocialLink() {
    setSocialLinks([...socialLinks, { key: '', value: '' }]);
  }

  function removeSocialLink(index: number) {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  }

  function updateSocialLink(index: number, field: 'key' | 'value', val: string) {
    setSocialLinks(socialLinks.map((link, i) => (i === index ? { ...link, [field]: val } : link)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const socialLinksObj: Record<string, string> = {};
    for (const link of socialLinks) {
      if (link.key && link.value) {
        socialLinksObj[link.key] = link.value;
      }
    }

    try {
      await api.artists.update(id, {
        name,
        description: description || null,
        imageUrl: imageUrl || null,
        socialLinks: Object.keys(socialLinksObj).length > 0 ? socialLinksObj : null,
        spotifyId: spotifyId || null,
        spotifyUrl: spotifyLink || null,
      });
      router.push('/artists');
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.artists.delete(id);
      router.push('/artists');
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다');
    }
  }

  if (fetching) {
    return <p className="empty-state">로딩 중...</p>;
  }

  return (
    <div>
      <h1 className="page-heading mb-8">아티스트 수정</h1>

      {error && (
        <div className="alert-error mb-6">{error}</div>
      )}

      {/* Spotify URL 입력 섹션 */}
      <div
        className="max-w-xl mb-8 p-5 rounded-xl"
        style={{ background: 'var(--spotify-light)', border: '1px solid rgba(29, 185, 84, 0.15)' }}
      >
        <label className="form-label" style={{ color: 'var(--spotify)' }}>
          Spotify URL로 정보 업데이트
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={spotifyUrl}
            onChange={(e) => setSpotifyUrl(e.target.value)}
            placeholder="https://open.spotify.com/artist/..."
            className="form-input flex-1"
          />
          <button
            type="button"
            onClick={handleSpotifyFetch}
            disabled={spotifyLoading || !spotifyUrl}
            className="btn-spotify"
          >
            {spotifyLoading ? '가져오는 중...' : '자동 채우기'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
        <div>
          <label className="form-label">이름 *</label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">설명</label>
          <textarea
            name="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-input"
            style={{ resize: 'vertical' }}
          />
        </div>

        <div>
          <label className="form-label">이미지 URL</label>
          <input
            name="imageUrl"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="form-input"
            placeholder="https://..."
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="아티스트 미리보기"
              className="mt-3 w-24 h-24 object-cover rounded-lg"
              style={{ border: '1px solid var(--card-border)' }}
            />
          )}
        </div>

        {/* Spotify 정보 */}
        {spotifyId && (
          <div
            className="p-4 rounded-xl space-y-3"
            style={{ background: 'var(--spotify-light)', border: '1px solid rgba(29, 185, 84, 0.12)' }}
          >
            <p className="text-[13px] font-semibold" style={{ color: 'var(--spotify)' }}>
              Spotify 정보
            </p>
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
          </div>
        )}

        {/* 소셜 링크 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="form-label mb-0">소셜 링크</label>
            <button type="button" onClick={addSocialLink} className="btn-text">
              + 추가
            </button>
          </div>
          {socialLinks.map((link, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                value={link.key}
                onChange={(e) => updateSocialLink(index, 'key', e.target.value)}
                placeholder="플랫폼 (예: instagram)"
                className="form-input"
                style={{ width: '35%', flex: 'none' }}
              />
              <input
                value={link.value}
                onChange={(e) => updateSocialLink(index, 'value', e.target.value)}
                placeholder="URL"
                className="form-input flex-1"
              />
              <button
                type="button"
                onClick={() => removeSocialLink(index)}
                className="btn-text-danger px-2"
              >
                삭제
              </button>
            </div>
          ))}
          {socialLinks.length === 0 && (
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              소셜 링크가 없습니다. &quot;+ 추가&quot; 버튼을 눌러주세요.
            </p>
          )}
        </div>

        <div className="pt-2 flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '저장 중...' : '저장'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="btn-text-danger"
          >
            삭제
          </button>
        </div>
      </form>
    </div>
  );
}
