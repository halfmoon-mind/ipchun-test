import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { api, type ArtistSummaryWithFollow, type CalendarPerformance } from '../../src/api/client';

interface ArtistWithPerformances extends ArtistSummaryWithFollow {
  upcomingCount: number;
  nextPerformanceDate: string | null;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [follows, setFollows] = useState<ArtistWithPerformances[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const followedArtists = await api.users.getFollows();
      if (followedArtists.length === 0) {
        setFollows([]);
        return;
      }

      const artistsWithPerfs = await Promise.all(
        followedArtists.map(async (artist) => {
          try {
            const upcomingData = await api.performances.getByArtist(artist.id, {
              period: 'upcoming',
              limit: 1,
            });
            return {
              ...artist,
              upcomingCount: upcomingData.data.length > 0 ? upcomingData.data.length : 0,
              nextPerformanceDate:
                upcomingData.data.length > 0
                  ? upcomingData.data[0].schedules[0]?.dateTime ?? null
                  : null,
            };
          } catch {
            return { ...artist, upcomingCount: 0, nextPerformanceDate: null };
          }
        }),
      );

      artistsWithPerfs.sort((a, b) => {
        if (a.nextPerformanceDate && b.nextPerformanceDate) {
          return new Date(a.nextPerformanceDate).getTime() - new Date(b.nextPerformanceDate).getTime();
        }
        if (a.nextPerformanceDate) return -1;
        if (b.nextPerformanceDate) return 1;
        return 0;
      });

      setFollows(artistsWithPerfs);
    } catch {
      setError('팔로우 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadFeed();
    }
  }, [user, loadFeed]);

  if (authLoading) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
        <Spinner size="large" color="$accentColor" />
      </YStack>
    );
  }

  if (!user) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        paddingTop={insets.top}
        paddingBottom={insets.bottom}
      >
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
          <Text fontFamily="$heading" fontSize="$largeTitle" fontWeight="$largeTitle" color="$color">
            ipchun
          </Text>
          <Text fontFamily="$body" fontSize="$subhead" color="$colorSecondary">
            인디 아티스트를 더 가까이
          </Text>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingTop={insets.top}
    >
      <YStack paddingHorizontal="$4" paddingTop="$4" paddingBottom="$2">
        <Text fontFamily="$heading" fontSize="$title" fontWeight="$title" color="$color">
          내 아티스트
        </Text>
      </YStack>

      {loading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$accentColor" />
        </YStack>
      ) : error ? (
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" padding="$4">
          <Text color="$colorSecondary" fontSize="$body" textAlign="center">
            {error}
          </Text>
          <Pressable onPress={loadFeed}>
            <Text color="$accentColor" fontSize="$body" fontWeight="600">
              다시 시도
            </Text>
          </Pressable>
        </YStack>
      ) : follows.length === 0 ? (
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" padding="$6">
          <Ionicons name="heart-outline" size={48} color="#E5E2DC" />
          <Text
            fontFamily="$body"
            fontSize="$body"
            color="$colorSecondary"
            textAlign="center"
          >
            팔로우한 아티스트가 없습니다
          </Text>
          <Text
            fontFamily="$body"
            fontSize="$caption"
            color="$colorTertiary"
            textAlign="center"
          >
            아티스트 탭에서 팔로우 해보세요
          </Text>
        </YStack>
      ) : (
        <YStack paddingBottom={insets.bottom}>
          {follows.map((artist) => (
            <ArtistFollowCard
              key={artist.id}
              artist={artist}
              onPress={() => router.push(`/artists/${artist.id}`)}
            />
          ))}
        </YStack>
      )}
    </YStack>
  );
}

function ArtistFollowCard({
  artist,
  onPress,
}: {
  artist: ArtistWithPerformances;
  onPress: () => void;
}) {
  const formattedDate = artist.nextPerformanceDate
    ? formatNextPerformanceDate(new Date(artist.nextPerformanceDate))
    : null;

  return (
    <Pressable onPress={onPress}>
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        alignItems="center"
        gap="$3"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <YStack
          width={48}
          height={48}
          borderRadius="$sm"
          backgroundColor="$backgroundElevated"
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
        >
          {artist.imageUrl ? (
            <Image
              source={{ uri: artist.imageUrl }}
              style={{ width: 48, height: 48 }}
            />
          ) : (
            <Ionicons name="person" size={24} color="#777777" />
          )}
        </YStack>

        <YStack flex={1} gap="$0.5">
          <Text fontFamily="$body" fontSize="$body" fontWeight="600" color="$color">
            {artist.name}
          </Text>
          {formattedDate ? (
            <XStack alignItems="center" gap="$1">
              <Ionicons name="calendar-outline" size={12} color="#777777" />
              <Text fontFamily="$body" fontSize="$caption" color="$accentColor">
                {formattedDate}
              </Text>
            </XStack>
          ) : (
            <Text fontFamily="$body" fontSize="$caption" color="$colorTertiary">
              예정된 공연 없음
            </Text>
          )}
        </YStack>

        <Ionicons name="chevron-forward" size={16} color="#777777" />
      </XStack>
    </Pressable>
  );
}

function formatNextPerformanceDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[date.getDay()];
  return `${month}월 ${day}일 (${dayName}) 공연`;
}
