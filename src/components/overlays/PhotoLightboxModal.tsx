import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { resolvePhotoUrl } from "../ui/Avatar";
import { colors, fontFamily, radius, spacing } from "../../theme";

interface PhotoLightboxModalProps {
  visible: boolean;
  photoUrl?: string | null;
  photos?: (string | null | undefined)[];
  initialIndex?: number;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function PhotoLightboxModal({
  visible,
  photoUrl,
  photos,
  initialIndex = 0,
  onClose,
}: PhotoLightboxModalProps) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Compute resolved unique photo list
  const resolvedPhotos = (photos && photos.length > 0
    ? photos.map(resolvePhotoUrl).filter((u): u is string => Boolean(u))
    : photoUrl
    ? [resolvePhotoUrl(photoUrl)].filter((u): u is string => Boolean(u))
    : []) as string[];

  // Sync initial index when modal opens
  useEffect(() => {
    if (visible && resolvedPhotos.length > 0) {
      let startIndex = initialIndex;
      if (photoUrl) {
        const found = resolvedPhotos.indexOf(resolvePhotoUrl(photoUrl) || "");
        if (found !== -1) startIndex = found;
      }
      setActiveIndex(startIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: startIndex, animated: false });
      }, 50);
    }
  }, [visible, photoUrl]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Swipe down to dismiss
        return gestureState.dy > 30 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50) {
          onClose();
        }
      },
    })
  ).current;

  if (!visible || resolvedPhotos.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.backdrop} {...panResponder.panHandlers}>
        <FlatList
          ref={flatListRef}
          data={resolvedPhotos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `${item}-${index}`}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={(evt) => {
            const index = Math.round(evt.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveIndex(index);
          }}
          renderItem={({ item }) => (
            <Pressable style={styles.slide} onPress={onClose}>
              <Image
                source={{ uri: item }}
                style={styles.fullScreenImage}
                contentFit="contain"
              />
            </Pressable>
          )}
        />

        {/* Top Header: Indicator & Close Button */}
        <View style={[styles.topHeader, { top: Math.max(insets.top + 8, 20) }]}>
          {resolvedPhotos.length > 1 ? (
            <View style={styles.indicatorPill}>
              <Text style={styles.indicatorText}>
                {activeIndex + 1} / {resolvedPhotos.length}
              </Text>
            </View>
          ) : <View />}

          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
          >
            <Feather name="x" size={24} color={colors.surface} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000000",
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topHeader: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  indicatorPill: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  indicatorText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.surface,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
});
