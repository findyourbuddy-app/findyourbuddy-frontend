import { useEffect, useState, useMemo, useRef } from "react";
import { Animated, ActivityIndicator, KeyboardAvoidingView, Linking, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Alert } from "../utils/alert";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { resolvePhotoUrl } from "../components/ui/Avatar";
import { Chip } from "../components/ui/Chip";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { LocationPickerModal } from "../components/overlays/LocationPickerModal";
import type { GeocodingResult } from "../api/geocoding";
import { createEvent, createEventCreditsCheckoutSession, getEventCreationQuota } from "../api/events";
import { getCurrentUser } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import type { EventCreationQuota } from "../types";
import { CATEGORIES } from "../constants/categories";
import * as Location from "expo-location";
import { resolveCityDistrict } from "../utils/location";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
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

function RectangleCropModal({
  visible,
  uri,
  onClose,
}: {
  visible: boolean;
  uri: string;
  onClose: () => void;
}) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value || 0,
          y: (pan.y as any)._value || 0,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalCropBackdrop}>
        <View style={styles.modalCropHeader}>
          <Text style={styles.modalCropTitle}>Dikdörtgen Çerçeve Hizalama</Text>
          <Pressable style={styles.modalCropDoneBtn} onPress={onClose}>
            <Text style={styles.modalCropDoneBtnText}>Tamam</Text>
          </Pressable>
        </View>

        <View style={styles.modalCropViewport}>
          <Animated.View
            style={[
              styles.modalCropImageWrapper,
              {
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Image source={{ uri }} style={styles.modalCropImage} contentFit="contain" />
          </Animated.View>

          {/* Bounding Rectangle Overlay */}
          <View style={styles.modalCropFrameOverlay} pointerEvents="none">
            <View style={[styles.cornerHandle, styles.topLeft]} />
            <View style={[styles.cornerHandle, styles.topRight]} />
            <View style={[styles.cornerHandle, styles.bottomLeft]} />
            <View style={[styles.cornerHandle, styles.bottomRight]} />
          </View>
        </View>

        <View style={styles.modalCropHintBar}>
          <Feather name="move" size={14} color="#FFFFFF" />
          <Text style={styles.modalCropHintText}>
            Parmağınla sürükleyerek dikdörtgen alana yerleştir 🖐️
          </Text>
        </View>
      </View>
    </Modal>
  );
}

export function CreateEventScreen() {
  const navigation = useNavigation<CreateEventNavigationProp>();
  const { user, updateUser } = useAuth();
  const { t, accentColor, bgGradient, language } = useAppTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].slug);
  const [locationName, setLocationName] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [isLocationPickerVisible, setIsLocationPickerVisible] = useState(false);
  const [dateText, setDateText] = useState("");
  const [timeText, setTimeText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGroupEvent, setIsGroupEvent] = useState(false);
  const [maxAttendees, setMaxAttendees] = useState("10");
  const [isPaid, setIsPaid] = useState(false);
  const [ticketPrice, setTicketPrice] = useState("");
  const [selectedStockUrl, setSelectedStockUrl] = useState<string | null>(null);

  const currentCategoryMeta = useMemo(() => {
    return CATEGORIES.find((c) => c.slug === category);
  }, [category]);

  const currentStockImages = useMemo(() => {
    return currentCategoryMeta?.stockImages || [];
  }, [currentCategoryMeta]);

  const activeStockUrl = useMemo(() => {
    if (selectedStockUrl && currentStockImages.includes(selectedStockUrl)) {
      return selectedStockUrl;
    }
    return currentStockImages[0] || currentCategoryMeta?.defaultImage || "";
  }, [selectedStockUrl, currentStockImages, currentCategoryMeta]);
  const [quota, setQuota] = useState<EventCreationQuota | null>(null);
  const [isQuotaLoading, setIsQuotaLoading] = useState(true);
  const [isBuyingCredits, setIsBuyingCredits] = useState(false);
  const [quotaModalVisible, setQuotaModalVisible] = useState(false);

  function refreshQuota(): void {
    setIsQuotaLoading(true);
    getEventCreationQuota()
      .then(setQuota)
      .catch(() => {
        // Best-effort; the 429 on submit still guards the actual limit.
      })
      .finally(() => setIsQuotaLoading(false));
  }

  useEffect(refreshQuota, []);

  async function handleBuyCredits(): Promise<void> {
    setIsBuyingCredits(true);
    try {
      const { checkout_url } = await createEventCreditsCheckoutSession();
      if (checkout_url) {
        Linking.openURL(checkout_url);
      } else {
        Alert.alert("Ödeme Hatası", "Ödeme linki alınamadı.");
      }
    } catch {
      Alert.alert(
        "Ödeme Hatası",
        "Ödeme sayfası başlatılamadı. Lütfen sunucunun açık olduğundan emin ol."
      );
    } finally {
      setIsBuyingCredits(false);
    }
  }

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

  function handleLocationSelect(result: GeocodingResult): void {
    setCoordinates({ latitude: result.latitude, longitude: result.longitude });
    setLocationName((current) => (current.trim() ? current : result.display_name));
    setIsLocationPickerVisible(false);
  }

  async function handleSave(): Promise<void> {
    if (isSaving) return;
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
    const parsedPrice = ticketPrice.trim() ? Number(ticketPrice.trim().replace(",", ".")) : null;
    if (isPaid && (parsedPrice === null || Number.isNaN(parsedPrice) || parsedPrice <= 0)) {
      setError("Bilet fiyatını gir.");
      return;
    }

    setIsSaving(true);
    try {
      const imageUrlToSave = activeStockUrl;

      await createEvent({
        title: title.trim(),
        description: description.trim() ? description.trim() : undefined,
        category,
        image_url: imageUrlToSave,
        location_name: locationName.trim(),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        // Send a real UTC instant; the backend stores UTC wall-clock and the
        // app converts back to local on display. Sending local components here
        // made every event read back shifted by the device's UTC offset.
        starts_at: startsAt.toISOString(),
        is_group_event: isGroupEvent,
        max_attendees: isGroupEvent && maxAttendees.trim() ? parseInt(maxAttendees, 10) : null,
        is_paid: isPaid,
        ticket_price: isPaid ? parsedPrice : null,
      });
      try {
        const freshUser = await getCurrentUser();
        updateUser(freshUser);
      } catch {}
      navigation.goBack();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        setError(
          t("youReachedTheWeeklyEvent")
        );
        refreshQuota();
      } else {
        setError(
          t("couldNotCreateEventPlease")
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (isQuotaLoading) {
    return (
      <View style={[styles.background, styles.loadingContainer, { backgroundColor: bgGradient[0] }]}>
        <ActivityIndicator color={accentColor} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView
        style={[styles.background, { backgroundColor: bgGradient[0] }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
      {quota && !quota.is_premium && quota.weekly_limit !== null ? (
        <View style={styles.topQuotaRow}>
          <Pressable style={styles.topQuotaPill} onPress={() => setQuotaModalVisible(true)}>
            <Feather name="zap" size={13} color="#F1C40F" />
            <Text style={styles.topQuotaPillText}>
              {Math.max(quota.weekly_limit - quota.events_created_this_week, 0)}/{quota.weekly_limit} {t("left")}
            </Text>
            <Feather name="info" size={12} color={colors.primary} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>{t("eventTitleLabel")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("eventTitlePlaceholder")}
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>{t("descriptionLabel")}</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder={t("descriptionPlaceholder")}
          placeholderTextColor={colors.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
        />
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>{t("categoryLabel")}</Text>
        <View style={styles.chipGrid}>
          {CATEGORIES.map((item) => (
            <Chip
              key={item.slug}
              label={language === "en" ? item.labelEn : item.label}
              active={category === item.slug}
              onPress={() => setCategory(item.slug)}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <View style={styles.coverPreviewCard}>
          <Image
            source={{ uri: activeStockUrl }}
            style={styles.coverPreviewImage}
            contentFit="cover"
          />
          <Text style={styles.stockGalleryTitle}>
            {t("selectCoverPhoto")}
          </Text>
          <View style={styles.stockGalleryGrid}>
            {currentStockImages.map((imgUrl) => {
              const isSelected = imgUrl === activeStockUrl;
              return (
                <Pressable
                  key={imgUrl}
                  style={[styles.stockThumbWrapper, isSelected && styles.stockThumbSelected]}
                  onPress={() => setSelectedStockUrl(imgUrl)}
                >
                  <Image source={{ uri: imgUrl }} style={styles.stockThumbImage} contentFit="cover" />
                  {isSelected ? (
                    <View style={styles.stockThumbBadge}>
                      <Feather name="check" size={12} color="#FFF" />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>{t("participationType")}</Text>
        <View style={styles.chipGrid}>
          <Chip
            label={t("oneOnOne")}
            active={!isGroupEvent}
            onPress={() => setIsGroupEvent(false)}
          />
          <Chip
            label={t("groupEvent")}
            active={isGroupEvent}
            onPress={() => setIsGroupEvent(true)}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>
          {t("participationEntryCost")}
        </Text>
        <View style={styles.chipGrid}>
          <Chip
            label={t("freeNone")}
            active={!isPaid}
            onPress={() => setIsPaid(false)}
          />
          <Chip
            label={t("entryFeePaid")}
            active={isPaid}
            onPress={() => setIsPaid(true)}
          />
        </View>
        {isPaid ? (
          <>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder={
                t("estimatedCostPerPerson")
              }
              placeholderTextColor={colors.textSecondary}
              value={ticketPrice}
              onChangeText={setTicketPrice}
            />
          </>
        ) : null}
      </View>

      {isGroupEvent && (
        <View style={styles.field}>
          <Text style={typeScale.eyebrow}>{t("maxParticipantsLabel")}</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder={t("maxAttendeesEg15")}
            placeholderTextColor={colors.textSecondary}
            value={maxAttendees}
            onChangeText={setMaxAttendees}
          />
        </View>
      )}

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>{t("locationLabel")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("locationPlaceholder")}
          placeholderTextColor={colors.textSecondary}
          value={locationName}
          onChangeText={setLocationName}
        />
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>{t("mapLocationHeader")}</Text>
        <PrimaryButton
          label={coordinates ? (t("locationSelected")) : t("selectLocationMap")}
          onPress={() => setIsLocationPickerVisible(true)}
          variant="outline"
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.field, styles.rowItem]}>
          <Text style={typeScale.eyebrow}>{t("dateHeader")}</Text>
          <Pressable style={styles.pickerTrigger} onPress={() => setIsCalendarVisible(true)}>
            <Text style={[styles.pickerTriggerText, !dateText && { color: colors.textSecondary }]}>
              {dateText || t("selectDate")}
            </Text>
            <Feather name="calendar" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={[styles.field, styles.rowItem]}>
          <Text style={typeScale.eyebrow}>{t("timeHeader")}</Text>
          <Pressable style={styles.pickerTrigger} onPress={() => setIsTimeVisible(true)}>
            <Text style={[styles.pickerTriggerText, !timeText && { color: colors.textSecondary }]}>
              {timeText || t("selectTime")}
            </Text>
            <Feather name="clock" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label={t("publishEventBtn")} onPress={handleSave} loading={isSaving} />

      <LocationPickerModal
        visible={isLocationPickerVisible}
        onSelect={handleLocationSelect}
        onDismiss={() => setIsLocationPickerVisible(false)}
        initialLatitude={coordinates?.latitude}
        initialLongitude={coordinates?.longitude}
      />

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

      {/* QUOTA & EXTRA CREDITS MODAL SHEET */}
      <Modal visible={quotaModalVisible} transparent animationType="fade" onRequestClose={() => setQuotaModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setQuotaModalVisible(false)}>
          <Pressable style={styles.quotaModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.quotaModalTitle}>
                {t("weeklyEventCreationQuota")}
              </Text>
              <Pressable onPress={() => setQuotaModalVisible(false)}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {quota ? (
              <View style={{ gap: spacing.sm, marginVertical: spacing.sm }}>
                <Text style={styles.quotaModalDesc}>
                  {t("youHaveP0p1FreeEvent", { p0: Math.max((quota.weekly_limit ?? 3) - quota.events_created_this_week, 0), p1: quota.weekly_limit ?? 3 })}
                </Text>
                {quota.credits_balance > 0 ? (
                  <View style={styles.creditsBox}>
                    <Feather name="check-circle" size={14} color="#2ECC71" />
                    <Text style={styles.creditsBoxText}>
                      {t("extraCreditsBalanceP0", { p0: quota.credits_balance })}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
              <PrimaryButton
                label={t("buy3ExtraCredits49")}
                onPress={() => {
                  setQuotaModalVisible(false);
                  handleBuyCredits();
                }}
                loading={isBuyingCredits}
              />
              <PrimaryButton
                label={t("upgradeToPremiumUnlimited")}
                onPress={async () => {
                  setQuotaModalVisible(false);
                  try {
                    const { createCheckoutSession } = require("../api/subscriptions");
                    const { checkout_url } = await createCheckoutSession();
                    if (checkout_url) {
                      Linking.openURL(checkout_url);
                    }
                  } catch {}
                }}
                variant="outline"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingView>
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
  topQuotaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: -spacing.xs,
  },
  topQuotaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(74, 194, 226, 0.35)",
    ...shadows.card,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  topQuotaPillText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  quotaModalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    width: "100%",
    maxWidth: 340,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  quotaModalTitle: {
    fontFamily: fontFamily.displayBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  quotaModalDesc: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  creditsBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(46, 204, 113, 0.1)",
    padding: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  creditsBoxText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: "#2ECC71",
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
  helperText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  quotaCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
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
  photoTipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.primary}15`,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  photoTipText: {
    flex: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  coverPreviewCard: {
    marginTop: spacing.xs,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverPreviewImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#15102A",
  },
  fitPill: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fitPillActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  fitPillText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  fitPillTextActive: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
  },
  customPhotoPlaceholder: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    gap: spacing.xs,
    padding: spacing.md,
  },
  customPhotoPlaceholderText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  coverPreviewCaption: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
    padding: spacing.xs,
    textAlign: "center",
  },
  stockGalleryTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginHorizontal: spacing.sm,
  },
  stockGalleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  stockThumbWrapper: {
    width: 76,
    height: 54,
    borderRadius: radius.sm,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  stockThumbSelected: {
    borderColor: colors.primary,
  },
  stockThumbImage: {
    width: "100%",
    height: "100%",
  },
  stockThumbBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientFallbackIcon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cropEditorCard: {
    marginTop: spacing.xs,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cropEditorHeader: {
    fontFamily: fontFamily.displayBold,
    fontSize: 12,
    color: colors.primary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  cropFrameViewport: {
    height: 180,
    overflow: "hidden",
    backgroundColor: "#110D23",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  cropImageWrapper: {
    width: "100%",
    height: "100%",
  },
  cropImage: {
    width: "100%",
    height: "100%",
  },
  tapToCropBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 6,
    backgroundColor: colors.primary,
  },
  tapToCropText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: "#FFFFFF",
  },
  modalCropBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  modalCropHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  modalCropTitle: {
    fontFamily: fontFamily.displayBold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  modalCropDoneBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  modalCropDoneBtnText: {
    fontFamily: fontFamily.displayBold,
    fontSize: 13,
    color: "#FFFFFF",
  },
  modalCropViewport: {
    width: "100%",
    height: 240,
    overflow: "hidden",
    backgroundColor: "#0B0818",
    borderRadius: radius.card,
    position: "relative",
  },
  modalCropImageWrapper: {
    width: "100%",
    height: "100%",
  },
  modalCropImage: {
    width: "100%",
    height: "100%",
  },
  modalCropFrameOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.card,
  },
  modalCropHintBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  modalCropHintText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: "#FFFFFF",
  },
  cropOverlayGrid: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: `${colors.primary}70`,
    margin: spacing.xs,
    borderRadius: radius.sm,
  },
  cornerHandle: {
    position: "absolute",
    width: 14,
    height: 14,
    borderColor: colors.primary,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
});
