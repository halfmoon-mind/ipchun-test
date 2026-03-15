import { useEffect, useState, useCallback } from 'react';
import { Image, Linking, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { YStack, XStack, Text, Spinner, ScrollView, useTheme } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type Artist } from '../../src/api/client';

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.artists.getOne(id);
      setArtist(data);
    } catch {
      setError('아티스트 정보를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
        <Spinner size="large" color="$accentColor" />
      </YStack>
    );
  }

  if (error || !artist) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" gap="$3" padding="$4">
        <Ionicons name="alert-circle-outline" size={48} color={theme.negativeColor.val} />
        <Text fontFamily="$body" fontSize="$body" color="$colorSecondary" textAlign="center">
          {error ?? '아티스트를 찾을 수 없습니다'}
        </Text>
        <Pressable onPress={load}>
          <Text fontFamily="$body" fontSize="$body" color="$accentColor" fontWeight="600">
            재시도
          </Text>
        </Pressable>
      </YStack>
    );
  }

  const socialEntries = artist.socialLinks ? Object.entries(artist.socialLinks) : [];

  return (
    <ScrollView backgroundColor="$background" contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
      {/* Profile Header */}
      <XStack padding="$4" gap="$4" alignItems="center">
        {artist.imageUrl ? (
          <Image
            source={{ uri: artist.imageUrl }}
            style={{ width: 80, height: 80, borderRadius: 40 }}
          />
        ) : (
          <YStack
            width={80}
            height={80}
            borderRadius={40}
            backgroundColor="$backgroundNested"
            alignItems="center"
            justifyContent="center"
          >
            <Ionicons name="person" size={36} color={theme.colorTertiary.val} />
          </YStack>
        )}
        <YStack flex={1} gap="$1">
          <Text fontFamily="$heading" fontSize="$title" fontWeight="$title" color="$color">
            {artist.name}
          </Text>
          {(artist.followers != null || artist.monthlyListeners != null) && (
            <XStack gap="$3">
              {artist.followers != null && (
                <Text fontFamily="$body" fontSize="$caption" color="$colorSecondary">
                  팔로워 {artist.followers.toLocaleString()}
                </Text>
              )}
              {artist.monthlyListeners != null && (
                <Text fontFamily="$body" fontSize="$caption" color="$colorSecondary">
                  월간 리스너 {artist.monthlyListeners.toLocaleString()}
                </Text>
              )}
            </XStack>
          )}
        </YStack>
      </XStack>

      {/* Spotify Link */}
      {artist.spotifyUrl && (
        <YStack paddingHorizontal="$4" paddingBottom="$3">
          <Pressable onPress={() => Linking.openURL(artist.spotifyUrl!)}>
            <XStack
              backgroundColor="$backgroundNested"
              borderRadius="$md"
              padding="$3"
              alignItems="center"
              gap="$2"
            >
              <Ionicons name="musical-note" size={18} color={theme.accentColor.val} />
              <Text fontFamily="$body" fontSize="$body" color="$accentColor" fontWeight="600">
                Spotify에서 듣기
              </Text>
            </XStack>
          </Pressable>
        </YStack>
      )}

      {/* Description */}
      {artist.description && (
        <YStack paddingHorizontal="$4" paddingBottom="$4">
          <Text fontFamily="$body" fontSize="$body" color="$colorSecondary" lineHeight={22}>
            {artist.description}
          </Text>
        </YStack>
      )}

      {/* Social Links */}
      {socialEntries.length > 0 && (
        <YStack paddingHorizontal="$4" paddingBottom="$4" gap="$2">
          <Text fontFamily="$body" fontSize="$caption" color="$colorTertiary" fontWeight="600">
            소셜 링크
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            {socialEntries.map(([name, url]) => (
              <Pressable key={name} onPress={() => Linking.openURL(url)}>
                <YStack
                  backgroundColor="$backgroundNested"
                  borderRadius="$sm"
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                >
                  <Text fontFamily="$body" fontSize="$caption" color="$accentColor" fontWeight="600">
                    {name}
                  </Text>
                </YStack>
              </Pressable>
            ))}
          </XStack>
        </YStack>
      )}
    </ScrollView>
  );
}
