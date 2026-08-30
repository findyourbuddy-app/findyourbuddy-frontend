import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Alert } from "../../utils/alert";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { PrimaryButton } from "../ui/PrimaryButton";
import { MapLocationPicker } from "../maps/MapLocationPicker";
import { reverseGeocode, searchLocations } from "../../api/geocoding";
import type { GeocodingResult } from "../../api/geocoding";
import { colors, fontFamily, radius, spacing, typeScale } from "../../theme";

interface LocationPickerModalProps {
  visible: boolean;
  onSelect: (result: GeocodingResult) => void;
  onDismiss: () => void;
  initialLatitude?: number;
  initialLongitude?: number;
}

// Istanbul city center -- used only as a starting point for the map when no
// location has been picked yet, so the picker never opens on an empty ocean.
const DEFAULT_CENTER = { latitude: 41.0082, longitude: 28.9784 };

import { useAppTheme } from "../../context/ThemeContext";

export function LocationPickerModal({
  visible,
  onSelect,
  onDismiss,
  initialLatitude,
  initialLongitude,
}: LocationPickerModalProps) {
  const { language, t } = useAppTheme();
  const [coords, setCoords] = useState({
    latitude: initialLatitude ?? DEFAULT_CENTER.latitude,
    longitude: initialLongitude ?? DEFAULT_CENTER.longitude,
  });
  const [knownDisplayName, setKnownDisplayName] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset to the caller's known position (or the default) each time the
  // picker is reopened, so a previous session's map pan doesn't linger.
  useEffect(() => {
    if (!visible) return;
    if (initialLatitude && initialLongitude) {
      setCoords({ latitude: initialLatitude, longitude: initialLongitude });
    } else {
      Location.requestForegroundPermissionsAsync().then(({ status }) => {
        if (status === "granted") {
          Location.getCurrentPositionAsync({}).then((pos) => {
            setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          }).catch(() => {});
        }
      }).catch(() => {});
    }
    setKnownDisplayName(null);
    setIsSearchOpen(false);
    setQuery("");
    setResults([]);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function handleSearch(): Promise<void> {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setError(t("typeAtLeast3Characters"));
      return;
    }
    setError(null);
    setIsSearching(true);
    try {
      const found = await searchLocations(trimmed);
      setResults(found);
      if (found.length === 0) {
        setError(t("noResultsFoundTryA"));
      }
    } catch {
      setError(t("searchFailedPleaseTryAgain"));
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelectResult(result: GeocodingResult): void {
    setCoords({ latitude: result.latitude, longitude: result.longitude });
    setKnownDisplayName(result.display_name);
    setQuery("");
    setResults([]);
    setIsSearchOpen(false);
  }

  async function handleUseCurrentLocation(): Promise<void> {
    setIsLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("locationPermissionRequired"),
          t("pleaseGrantLocationPermissionTo")
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setKnownDisplayName(null);
    } catch {
      Alert.alert(
        t("locationError"),
        t("somethingWentWrongPleaseTry")
      );
    } finally {
      setIsLocating(false);
    }
  }

  function handlePinMove(next: { latitude: number; longitude: number }): void {
    setCoords(next);
    setKnownDisplayName(null);
  }

  async function handleConfirm(): Promise<void> {
    if (knownDisplayName) {
      onSelect({ ...coords, display_name: knownDisplayName });
      return;
    }
    setIsConfirming(true);
    try {
      const reversed = await reverseGeocode(coords.latitude, coords.longitude);
      onSelect(reversed);
    } catch {
      onSelect({
        ...coords,
        display_name: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
      });
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={typeScale.h1}>{t("selectLocation")}</Text>
            <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Kapat">
              <Feather name="x" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.hint}>{t("tapAPointOnThe")}</Text>

            <MapLocationPicker latitude={coords.latitude} longitude={coords.longitude} onChange={handlePinMove} />

            <Pressable style={styles.searchToggle} onPress={() => setIsSearchOpen((current) => !current)}>
              <Feather name="search" size={16} color={colors.primary} />
              <Text style={styles.searchToggleText}>{t("searchAddressOrPlaceEg")}</Text>
              <Feather name={isSearchOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
            </Pressable>

            {isSearchOpen ? (
              <View style={styles.searchPanel}>
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.input}
                    placeholder={t("egCentralPark")}
                    placeholderTextColor={colors.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                    autoFocus
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

                {results.map((item, index) => (
                  <Pressable
                    key={`${item.latitude}-${item.longitude}-${index}`}
                    style={styles.resultRow}
                    onPress={() => handleSelectResult(item)}
                  >
                    <Feather name="map-pin" size={16} color={colors.primary} />
                    <Text style={styles.resultText} numberOfLines={2}>
                      {item.display_name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {knownDisplayName ? (
              <View style={styles.selectedRow}>
                <Feather name="map-pin" size={16} color={colors.primary} />
                <Text style={styles.resultText} numberOfLines={2}>
                  {knownDisplayName}
                </Text>
              </View>
            ) : null}

            <PrimaryButton
              label={isLocating ? (t("getting")) : (t("useMyCurrentLocation"))}
              variant="outline"
              onPress={handleUseCurrentLocation}
              loading={isLocating}
            />
            <PrimaryButton
              label={isConfirming ? (t("confirming")) : (t("useThisLocation"))}
              onPress={handleConfirm}
              loading={isConfirming}
            />
          </ScrollView>
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
    paddingBottom: spacing.md,
    maxHeight: "90%",
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  hint: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  searchToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  searchToggleText: {
    flex: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.primary,
  },
  searchPanel: {
    gap: spacing.sm,
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
  resultRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  resultText: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
});
