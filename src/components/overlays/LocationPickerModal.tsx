import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { PrimaryButton } from "../ui/PrimaryButton";
import { MapLocationPicker } from "../maps/MapLocationPicker";
import { searchLocations } from "../../api/geocoding";
import type { GeocodingResult } from "../../api/geocoding";
import { colors, fontFamily, radius, spacing, typeScale } from "../../theme";

interface LocationPickerModalProps {
  visible: boolean;
  onSelect: (result: GeocodingResult) => void;
  onDismiss: () => void;
}

export function LocationPickerModal({ visible, onSelect, onDismiss }: LocationPickerModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<GeocodingResult | null>(null);

  async function handleSearch(): Promise<void> {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setError("En az 3 karakter yaz.");
      return;
    }
    setError(null);
    setIsSearching(true);
    try {
      const found = await searchLocations(trimmed);
      setResults(found);
      if (found.length === 0) {
        setError("Sonuç bulunamadı, farklı bir arama dener misin?");
      }
    } catch {
      setError("Arama yapılamadı. Lütfen tekrar dene.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleUseCurrentLocation(): Promise<void> {
    setIsLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Konum izni gerekli", "Mevcut konumunu kullanmak için izin vermen gerekiyor.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      handleSelectResult({
        display_name: "Mevcut Konumum",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      Alert.alert("Konum alınamadı", "Bir sorun oluştu, tekrar dener misin?");
    } finally {
      setIsLocating(false);
    }
  }

  function handleSelectResult(result: GeocodingResult): void {
    setQuery("");
    setResults([]);
    setPending(result);
  }

  function handlePinMove(coords: { latitude: number; longitude: number }): void {
    setPending((current) => (current ? { ...current, ...coords } : current));
  }

  function handleConfirm(): void {
    if (!pending) return;
    onSelect(pending);
    setPending(null);
  }

  function handleBackToSearch(): void {
    setPending(null);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {pending ? (
            <>
              <Text style={typeScale.h1}>Konumu Onayla</Text>
              <Text style={styles.resultText} numberOfLines={2}>
                {pending.display_name}
              </Text>
              <MapLocationPicker
                latitude={pending.latitude}
                longitude={pending.longitude}
                onChange={handlePinMove}
              />
              <PrimaryButton label="Bu Konumu Kullan" onPress={handleConfirm} />
              <PrimaryButton label="Aramaya Dön" variant="outline" onPress={handleBackToSearch} />
            </>
          ) : (
            <>
              <Text style={typeScale.h1}>Konum Seç</Text>

              <View style={styles.searchRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Adres veya mekan ara (örn. Moda Sahil)"
                  placeholderTextColor={colors.textSecondary}
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                <Pressable style={styles.searchButton} onPress={handleSearch} disabled={isSearching}>
                  {isSearching ? (
                    <ActivityIndicator color={colors.surface} size="small" />
                  ) : (
                    <Feather name="search" size={18} color={colors.surface} />
                  )}
                </Pressable>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <FlatList
                data={results}
                keyExtractor={(item, index) => `${item.latitude}-${item.longitude}-${index}`}
                style={styles.resultsList}
                renderItem={({ item }) => (
                  <Pressable style={styles.resultRow} onPress={() => handleSelectResult(item)}>
                    <Feather name="map-pin" size={16} color={colors.primary} />
                    <Text style={styles.resultText} numberOfLines={2}>
                      {item.display_name}
                    </Text>
                  </Pressable>
                )}
              />

              <PrimaryButton
                label={isLocating ? "Alınıyor..." : "Mevcut Konumumu Kullan"}
                variant="outline"
                onPress={handleUseCurrentLocation}
                loading={isLocating}
              />
              <PrimaryButton label="Kapat" variant="outline" onPress={onDismiss} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,10,40,0.7)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.md,
    maxHeight: "85%",
  },
  searchRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.accentRed,
  },
  resultsList: {
    maxHeight: 260,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultText: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
});
