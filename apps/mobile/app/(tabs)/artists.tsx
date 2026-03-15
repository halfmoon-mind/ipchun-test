import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type ArtistSummary } from '../../src/api/client';

export default function ArtistsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArtists = useCallback(async () => {
    try {
      setError(null);
      const data = await api.artists.getAll();
      setArtists(data);
    } catch (e) {
      setError('아티스트 목록을 불러올 수 없습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchArtists();
  }, [fetchArtists]);

  if (loading) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
        <Spinner size="large" color="$accentColor" />
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" gap="$3" padding="$4">
        <Ionicons name="alert-circle-outline" size={48} color={theme.negativeColor.val} />
        <Text fontFamily="$body" fontSize="$body" color="$colorSecondary" textAlign="center">
          {error}
        </Text>
      </YStack>
    );
  }

  if (artists.length === 0) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" gap="$3" padding="$4">
        <Ionicons name="people-outline" size={48} color={theme.colorTertiary.val} />
        <Text fontFamily="$body" fontSize="$body" color="$colorSecondary" textAlign="center">
          등록된 아티스트가 없습니다
        </Text>
        <Text fontFamily="$body" fontSize="$caption" color="$colorTertiary" textAlign="center">
          아티스트가 등록되면 여기에 표시됩니다
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <FlatList
        data={artists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accentColor.val} />
        }
        ItemSeparatorComponent={() => <YStack height={1} backgroundColor="$separatorColor" marginVertical="$3" />}
        renderItem={({ item }) => (
          <XStack
            alignItems="center"
            gap="$3"
            paddingVertical="$2"
            onPress={() => router.push(`/artists/${item.id}`)}
            pressStyle={{ opacity: 0.7 }}
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={{ width: 56, height: 56, borderRadius: 28 }}
              />
            ) : (
              <YStack
                width={56}
                height={56}
                borderRadius={28}
                backgroundColor="$backgroundNested"
                alignItems="center"
                justifyContent="center"
              >
                <Ionicons name="person" size={24} color={theme.colorTertiary.val} />
              </YStack>
            )}
            <YStack flex={1} gap="$1">
              <Text fontFamily="$body" fontSize="$body" fontWeight="600" color="$color">
                {item.name}
              </Text>
              {item.description && (
                <Text fontFamily="$body" fontSize="$caption" color="$colorSecondary" numberOfLines={1}>
                  {item.description}
                </Text>
              )}
            </YStack>
          </XStack>
        )}
      />
    </YStack>
  );
}
