import { useEffect, useState, useMemo } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { Chip } from "../components/ui/Chip";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { createEvent } from "../api/events";
import { CATEGORIES } from "../constants/categories";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";

type CreateEventNavigationProp = NativeStackNavigationProp<MainStackParamList, "CreateEvent">;

const DATE_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

const TURKISH_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const WEEK_DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function parseLocalDateTime(dateText: string, timeText: string): Date | null {
  const dateMatch = DATE_PATTERN.exec(dateText.trim());
  const timeMatch = TIME_PATTERN.exec(timeText.trim());
  if (!dateMatch || !timeMatch) {
    return null;
  }
  const [, day, month, year] = dateMatch;
  const [, hours, minutes] = timeMatch;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes)
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function CreateEventScreen() {
  const navigation = useNavigation<CreateEventNavigationProp>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].slug);
  const [locationName, setLocationName] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [isLocating, setIsLocating] = useState(false);
  const [dateText, setDateText] = useState("");
  const [timeText, setTimeText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Picker States
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [isTimeVisible, setIsTimeVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState("12");
  const [selectedMinute, setSelectedMinute] = useState("00");

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    
    // Day of week of the first day (0 = Sunday, 1 = Monday...)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;
    
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  }, [calendarMonth]);

  const handlePrevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    setDateText(`${day}.${month}.${year}`);
    setIsCalendarVisible(false);
  };

  const handleTimeConfirm = () => {
    setTimeText(`${selectedHour}:${selectedMinute}`);
    setIsTimeVisible(false);
  };

  const hourOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  }, []);

  const minuteOptions = ["00", "15", "30", "45"];

  async function handleUseLocation(silent = false): Promise<void> {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!silent) {
          Alert.alert("Konum izni gerekli", "Etkinlik konumunu almak için izin vermen gerekiyor.");
        }
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;
      setCoordinates({ latitude, longitude });

      // Reverse geocoding has no web implementation in expo-location; skip
      // there and let the user type the location name manually instead.
      if (Platform.OS !== "web") {
        try {
          const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (place) {
            const readable = [place.name, place.street, place.district ?? place.subregion, place.city]
              .filter(Boolean)
              .join(", ");
            if (readable) {
              setLocationName((current) => (current.trim() ? current : readable));
            }
          }
        } catch {
          // Best-effort; manual entry still works if reverse geocoding fails.
        }
      }
    } catch {
      if (!silent) {
        Alert.alert("Konum alınamadı", "Bir sorun oluştu, tekrar dener misin?");
      }
    } finally {
      setIsLocating(false);
    }
  }

  useEffect(() => {
    handleUseLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(): Promise<void> {
    setError(null);

    if (!title.trim()) {
      setError("Etkinlik başlığı gerekli.");
      return;
    }
    if (!locationName.trim()) {
      setError("Konum adı gerekli.");
      return;
    }
    if (!coordinates) {
      setError("Etkinlik konumunu belirtmen gerekiyor.");
      return;
    }
    const startsAt = parseLocalDateTime(dateText, timeText);
    if (!startsAt) {
      setError("Lütfen tarih ve saat seçin.");
      return;
    }
    if (startsAt.getTime() < Date.now()) {
      setError("Etkinlik tarihi gelecekte olmalı.");
      return;
    }

    setIsSaving(true);
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim() ? description.trim() : undefined,
        category,
        location_name: locationName.trim(),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        starts_at: startsAt.toISOString().replace("Z", ""),
      });
      navigation.goBack();
    } catch {
      setError("Etkinlik oluşturulamadı. Bilgileri kontrol edip tekrar dene.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView style={styles.background} contentContainerStyle={styles.content}>
      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Başlık</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn. Kadıköy Akşam Koşusu"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Açıklama</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Etkinlik hakkında kısa bilgi..."
          placeholderTextColor={colors.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
        />
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Kategori</Text>
        <View style={styles.chipGrid}>
          {CATEGORIES.map((item) => (
            <Chip
              key={item.slug}
              label={item.label}
              active={category === item.slug}
              onPress={() => setCategory(item.slug)}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Konum Adı</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn. Moda Sahil"
          placeholderTextColor={colors.textSecondary}
          value={locationName}
          onChangeText={setLocationName}
        />
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Koordinatlar</Text>
        <PrimaryButton
          label={coordinates ? "Konum Alındı ✓" : "Mevcut Konumumu Kullan"}
          onPress={() => handleUseLocation(false)}
          variant="outline"
          loading={isLocating}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.field, styles.rowItem]}>
          <Text style={typeScale.eyebrow}>Tarih</Text>
          <Pressable style={styles.pickerTrigger} onPress={() => setIsCalendarVisible(true)}>
            <Text style={[styles.pickerTriggerText, !dateText && { color: colors.textSecondary }]}>
              {dateText || "Tarih Seç"}
            </Text>
            <Feather name="calendar" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={[styles.field, styles.rowItem]}>
          <Text style={typeScale.eyebrow}>Saat</Text>
          <Pressable style={styles.pickerTrigger} onPress={() => setIsTimeVisible(true)}>
            <Text style={[styles.pickerTriggerText, !timeText && { color: colors.textSecondary }]}>
              {timeText || "Saat Seç"}
            </Text>
            <Feather name="clock" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label="Etkinliği Oluştur" onPress={handleSave} loading={isSaving} />

      {/* CUSTOM CALENDAR MODAL */}
      <Modal visible={isCalendarVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Pressable onPress={handlePrevMonth}>
                <Feather name="chevron-left" size={20} color={colors.primary} />
              </Pressable>
              <Text style={styles.modalTitle}>
                {TURKISH_MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </Text>
              <Pressable onPress={handleNextMonth}>
                <Feather name="chevron-right" size={20} color={colors.primary} />
              </Pressable>
            </View>

            <View style={styles.calendarWeekdayHeader}>
              {WEEK_DAYS.map((d) => (
                <Text key={d} style={styles.calendarWeekdayText}>{d}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <View key={`empty-${index}`} style={styles.calendarCell} />;
                }
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                const isDisabled = date.getTime() < today.getTime();

                return (
                  <Pressable
                    key={date.toISOString()}
                    disabled={isDisabled}
                    style={[
                      styles.calendarCell,
                      isSelected && styles.calendarCellSelected,
                      isDisabled && styles.calendarCellDisabled
                    ]}
                    onPress={() => handleDateSelect(date)}
                  >
                    <Text
                      style={[
                        styles.calendarCellText,
                        isSelected && styles.calendarCellSelectedText,
                        isDisabled && { color: colors.textSecondary }
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalFooter}>
              <PrimaryButton
                label="Kapat"
                variant="outline"
                onPress={() => setIsCalendarVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* CUSTOM TIME PICKER MODAL */}
      <Modal visible={isTimeVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saat Seçin</Text>
            </View>

            <View style={styles.timePickerContainer}>
              {/* Hours Column */}
              <View style={styles.timePickerColumn}>
                <Text style={styles.timeColumnHeader}>Saat</Text>
                <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                  {hourOptions.map((hour) => {
                    const isActive = selectedHour === hour;
                    return (
                      <Pressable
                        key={hour}
                        style={[styles.timeItem, isActive && styles.timeItemActive]}
                        onPress={() => setSelectedHour(hour)}
                      >
                        <Text style={[styles.timeItemText, isActive && styles.timeItemActiveText]}>
                          {hour}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Minutes Column */}
              <View style={styles.timePickerColumn}>
                <Text style={styles.timeColumnHeader}>Dakika</Text>
                <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                  {minuteOptions.map((minute) => {
                    const isActive = selectedMinute === minute;
                    return (
                      <Pressable
                        key={minute}
                        style={[styles.timeItem, isActive && styles.timeItemActive]}
                        onPress={() => setSelectedMinute(minute)}
                      >
                        <Text style={[styles.timeItemText, isActive && styles.timeItemActiveText]}>
                          {minute === "00" ? "00 (Tam)" : minute}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
                onPress={() => setIsTimeVisible(false)}
              >
                <Text style={{ fontFamily: fontFamily.bodyMedium, color: colors.textSecondary }}>İptal</Text>
              </Pressable>
              <Pressable
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.pill
                }}
                onPress={handleTimeConfirm}
              >
                <Text style={{ fontFamily: fontFamily.bodySemiBold, color: colors.surface }}>Tamam</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  field: {
    gap: spacing.sm,
  },
  input: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  multilineInput: {
    borderRadius: radius.card,
    minHeight: 96,
    textAlignVertical: "top",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  rowItem: {
    flex: 1,
  },
  pickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pickerTriggerText: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
  },
  error: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.accentRed,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    width: "100%",
    maxWidth: 340,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  calendarWeekdayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  calendarWeekdayText: {
    width: "14.28%",
    textAlign: "center",
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing.xs,
  },
  calendarCell: {
    width: "14.28%",
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
  },
  calendarCellText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  calendarCellDisabled: {
    opacity: 0.25,
  },
  calendarCellSelected: {
    backgroundColor: colors.primary,
  },
  calendarCellSelectedText: {
    color: colors.surface,
    fontFamily: fontFamily.bodySemiBold,
  },
  timePickerContainer: {
    flexDirection: "row",
    height: 180,
    gap: spacing.md,
  },
  timePickerColumn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  timeColumnHeader: {
    textAlign: "center",
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.textSecondary,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.border,
  },
  timeScroll: {
    flex: 1,
  },
  timeItem: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  timeItemText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  timeItemActive: {
    backgroundColor: colors.primaryMuted,
  },
  timeItemActiveText: {
    color: colors.primary,
    fontFamily: fontFamily.bodySemiBold,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
