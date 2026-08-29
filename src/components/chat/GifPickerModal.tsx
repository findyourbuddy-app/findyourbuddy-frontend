import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../../theme";
import { fetchTrendingGifs, searchGifs, type GifResult } from "../../api/giphy";

interface GifPickerModalProps {
  visible: boolean;
  disabled?: boolean;
  language?: string;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

/**
 * Self-contained GIF picker. Keeping its search state here means typing in the
 * search box only re-renders this sheet, not the whole chat screen, and the
 * grid is a windowed FlatList so only the handful of visible GIFs animate.
 */
export function GifPickerModal({
  visible,
  disabled,
  language = "tr",
  onClose,
  onSelect,
}: GifPickerModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const run = useCallback((rawQuery: string) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    const request = rawQuery.trim() ? searchGifs(rawQuery.trim()) : fetchTrendingGifs();
    request
      .then((list) => {
        if (requestIdRef.current === requestId) setResults(list);
      })
      .catch(() => {
        if (requestIdRef.current === requestId) setResults([]);
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setResults([]);
      return;
    }
    run("");
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [visible, run]);

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => run(text), 300);
    },
    [run]
  );

  const renderItem = useCallback(
    ({ item }: { item: GifResult }) => (
      <Pressable style={styles.tile} onPress={() => onSelect(item.url)} disabled={disabled}>
        <Image
          source={{ uri: item.previewUrl }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={item.id}
        />
      </Pressable>
    ),
    [onSelect, disabled]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <Pressable style={styles.dragHandleTouch} onPress={onClose}>
              <View style={styles.dragHandle} />
            </Pressable>

            <View style={styles.header}>
              <Text style={typeScale.h2}>{language === "en" ? "Send GIF" : "GIF Gönder"}</Text>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10} accessibilityRole="button">
                <Feather name="x" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.searchBar}>
              <Feather name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={language === "en" ? "Search GIFs..." : "GIF ara..."}
                placeholderTextColor={colors.textSecondary}
                value={query}
                onChangeText={handleQueryChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <FlatList
              data={results}
              keyExtractor={(gif) => gif.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.grid}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={5}
              removeClippedSubviews
              renderItem={renderItem}
              ListEmptyComponent={
                isLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
                ) : (
                  <Text style={styles.emptyText}>
                    {language === "en" ? "No GIFs found." : "GIF bulunamadı."}
                  </Text>
                )
              }
            />
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 10, 40, 0.6)",
    justifyContent: "flex-end",
  },
  keyboardView: {
    width: "100%",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card * 1.5,
    borderTopRightRadius: radius.card * 1.5,
    padding: spacing.xl,
    paddingTop: spacing.xs,
    height: "75%",
    maxHeight: "85%",
    gap: spacing.md,
    ...shadows.card,
  },
  dragHandleTouch: {
    paddingVertical: 6,
    alignItems: "center",
    width: "100%",
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  grid: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  row: {
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 110,
  },
  emptyText: {
    textAlign: "center",
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginVertical: spacing.lg,
  },
});
