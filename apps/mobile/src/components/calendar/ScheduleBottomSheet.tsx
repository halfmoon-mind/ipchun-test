import { useCallback, useMemo, useRef } from 'react';
import { YStack, XStack, Text, Image, ScrollView, Button } from 'tamagui';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { GENRE_COLORS, GENRE_LABELS } from '../../constants/schedule';
import type { CalendarPerformance } from '../../api/client';

interface ScheduleBottomSheetProps {
  performance: CalendarPerformance | null;
  onClose: () => void;
  onDetail: (id: string) => void;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

export function ScheduleBottomSheet({ performance, onClose, onDetail }: ScheduleBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const theme = useTheme();
  const snapPoints = useMemo(() => ['50%', '80%'], []);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) onClose();
  }, [onClose]);

  if (!performance) return null;

  const genreColor = GENRE_COLORS[performance.genre] ?? GENRE_COLORS.OTHER;
  const genreLabel = GENRE_LABELS[performance.genre] ?? performance.genre;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: theme.backgroundElevated.val }}
      handleIndicatorStyle={{ backgroundColor: theme.colorTertiary.val }}
    >
      <BottomSheetView style={{ flex: 1 }}>
        <ScrollView>
          <YStack padding="$4" gap="$3">
            {performance.posterUrl && (
              <Image source={{ uri: performance.posterUrl }} width="100%" height={160} borderRadius="$md" />
            )}

            <XStack alignItems="center" gap="$2">
              <YStack backgroundColor={genreColor} paddingHorizontal="$2" paddingVertical={2} borderRadius="$sm">
                <Text fontSize={10} fontWeight="700" color="#FFFFFF">{genreLabel}</Text>
              </YStack>
            </XStack>
            <Text fontFamily="$heading" fontSize={20} fontWeight="700" color="$color">
              {performance.title}
            </Text>

            {/* Schedules (show times) */}
            {performance.schedules.length > 0 && (
              <Text fontFamily="$body" fontSize={14} color="$colorSecondary">
                {performance.schedules.map((s) => formatDateTime(s.dateTime)).join(' / ')}
              </Text>
            )}

            {/* Venue */}
            {performance.venue && (
              <YStack gap="$1">
                <Text fontFamily="$body" fontSize={14} color="$color">{performance.venue.name}</Text>
                {performance.venue.address && (
                  <Text fontFamily="$body" fontSize={12} color="$colorTertiary">{performance.venue.address}</Text>
                )}
              </YStack>
            )}

            {/* Artists */}
            {performance.artists.length > 0 && (
              <YStack gap="$2" marginTop="$2">
                <Text fontFamily="$heading" fontSize={14} fontWeight="600" color="$color">
                  라인업 ({performance.artists.length})
                </Text>
                {performance.artists.map((entry) => (
                  <XStack key={entry.id} gap="$3" alignItems="center" paddingVertical="$1">
                    {entry.artist.imageUrl ? (
                      <Image source={{ uri: entry.artist.imageUrl }} width={36} height={36} borderRadius={999} />
                    ) : (
                      <YStack width={36} height={36} borderRadius={999} backgroundColor="$backgroundNested" alignItems="center" justifyContent="center">
                        <Ionicons name="musical-note" size={14} color={theme.colorTertiary.val} />
                      </YStack>
                    )}
                    <YStack flex={1}>
                      <Text fontFamily="$body" fontSize={14} fontWeight="600" color="$color">
                        {entry.artist.name}
                      </Text>
                      <XStack gap="$2">
                        {entry.stageName && (
                          <Text fontSize={11} fontFamily="$body" color="$colorTertiary">{entry.stageName}</Text>
                        )}
                        {entry.startTime && (
                          <Text fontSize={11} fontFamily="$body" color="$colorSecondary">
                            {formatDateTime(entry.startTime)}
                            {entry.endTime && ` ~ ${formatDateTime(entry.endTime)}`}
                          </Text>
                        )}
                      </XStack>
                    </YStack>
                  </XStack>
                ))}
              </YStack>
            )}

            <Button
              marginTop="$3"
              backgroundColor="$accentColor"
              onPress={() => onDetail(performance.id)}
            >
              <Text fontFamily="$heading" fontWeight="700" color="#FFFFFF" fontSize={15}>
                상세 보기
              </Text>
            </Button>
          </YStack>
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
}
