import { useCallback, useMemo, useRef } from 'react';
import { YStack, XStack, Text, Image, ScrollView, Button } from 'tamagui';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { SCHEDULE_TYPE_COLORS, SCHEDULE_TYPE_LABELS } from '../../constants/schedule';
import type { CalendarSchedule } from '../../api/client';

interface ScheduleBottomSheetProps {
  schedule: CalendarSchedule | null;
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

export function ScheduleBottomSheet({ schedule, onClose, onDetail }: ScheduleBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const theme = useTheme();
  const snapPoints = useMemo(() => ['50%', '80%'], []);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) onClose();
  }, [onClose]);

  if (!schedule) return null;

  const typeColor = SCHEDULE_TYPE_COLORS[schedule.type] ?? SCHEDULE_TYPE_COLORS.OTHER;
  const typeLabel = SCHEDULE_TYPE_LABELS[schedule.type] ?? schedule.type;

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
            {/* Schedule image */}
            {schedule.imageUrl && (
              <Image source={{ uri: schedule.imageUrl }} width="100%" height={160} borderRadius="$md" />
            )}

            {/* Title + Badge */}
            <XStack alignItems="center" gap="$2">
              <YStack backgroundColor={typeColor} paddingHorizontal="$2" paddingVertical={2} borderRadius="$sm">
                <Text fontSize={10} fontWeight="700" color="#FFFFFF">{typeLabel}</Text>
              </YStack>
            </XStack>
            <Text fontFamily="$heading" fontSize={20} fontWeight="700" color="$color">
              {schedule.title}
            </Text>

            {/* Date/Time */}
            <Text fontFamily="$body" fontSize={14} color="$colorSecondary">
              {formatDateTime(schedule.startDate)}
              {schedule.endDate && ` ~ ${formatDateTime(schedule.endDate)}`}
            </Text>

            {/* Location */}
            {schedule.location && (
              <YStack gap="$1">
                <Text fontFamily="$body" fontSize={14} color="$color">{schedule.location}</Text>
                {schedule.address && (
                  <Text fontFamily="$body" fontSize={12} color="$colorTertiary">{schedule.address}</Text>
                )}
              </YStack>
            )}

            {/* Lineups */}
            {schedule.lineups.length > 0 && (
              <YStack gap="$2" marginTop="$2">
                <Text fontFamily="$heading" fontSize={14} fontWeight="600" color="$color">
                  라인업 ({schedule.lineups.length})
                </Text>
                {schedule.lineups.map((lineup) => (
                  <XStack key={lineup.id} gap="$3" alignItems="center" paddingVertical="$1">
                    {lineup.artist.imageUrl ? (
                      <Image
                        source={{ uri: lineup.artist.imageUrl }}
                        width={36}
                        height={36}
                        borderRadius={999}
                      />
                    ) : (
                      <YStack width={36} height={36} borderRadius={999} backgroundColor="$backgroundNested" alignItems="center" justifyContent="center">
                        <Ionicons name="musical-note" size={14} color={theme.colorTertiary.val} />
                      </YStack>
                    )}
                    <YStack flex={1}>
                      <Text fontFamily="$body" fontSize={14} fontWeight="600" color="$color">
                        {lineup.artist.name}
                      </Text>
                      <XStack gap="$2">
                        {lineup.stageName && (
                          <Text fontSize={11} fontFamily="$body" color="$colorTertiary">{lineup.stageName}</Text>
                        )}
                        {lineup.startTime && (
                          <Text fontSize={11} fontFamily="$body" color="$colorSecondary">
                            {formatDateTime(lineup.startTime)}
                            {lineup.endTime && ` ~ ${formatDateTime(lineup.endTime)}`}
                          </Text>
                        )}
                      </XStack>
                    </YStack>
                  </XStack>
                ))}
              </YStack>
            )}

            {/* Detail button */}
            <Button
              marginTop="$3"
              backgroundColor="$accentColor"
              onPress={() => onDetail(schedule.id)}
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
