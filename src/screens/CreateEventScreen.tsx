import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Chip } from "../components/ui/Chip";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { createEvent } from "../api/events";
import { CATEGORIES } from "../constants/categories";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";

type CreateEventNavigationProp = NativeStackNavigationProp<MainStackParamList, "CreateEvent">;

const DATE_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

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

  async function handleUseLocation(): Promise<void> {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Konum izni gerekli", "Etkinlik konumunu almak için izin vermen gerekiyor.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      Alert.alert("Konum alınamadı", "Bir sorun oluştu, tekrar dener misin?");
    } finally {
      setIsLocating(false);
    }
  }

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
      setError("Tarih GG.AA.YYYY, saat SS:DD formatında olmalı.");
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
          onPress={handleUseLocation}
          variant="outline"
          loading={isLocating}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.field, styles.rowItem]}>
          <Text style={typeScale.eyebrow}>Tarih</Text>
          <TextInput
            style={styles.input}
            placeholder="GG.AA.YYYY"
            placeholderTextColor={colors.textSecondary}
            value={dateText}
            onChangeText={setDateText}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={[styles.field, styles.rowItem]}>
          <Text style={typeScale.eyebrow}>Saat</Text>
          <TextInput
            style={styles.input}
            placeholder="SS:DD"
            placeholderTextColor={colors.textSecondary}
            value={timeText}
            onChangeText={setTimeText}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label="Etkinliği Oluştur" onPress={handleSave} loading={isSaving} />
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
  error: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.accentRed,
    textAlign: "center",
  },
});
