import { useRef } from "react";
import { Modal, PanResponder, Pressable, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { resolvePhotoUrl } from "../ui/Avatar";
import { colors, spacing } from "../../theme";

interface PhotoLightboxModalProps {
  visible: boolean;
  photoUrl: string | null;
  onClose: () => void;
}

export function PhotoLightboxModal({ visible, photoUrl, onClose }: PhotoLightboxModalProps) {
  const insets = useSafeAreaInsets();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only capture if single finger touch and dragged > 20px
        const isSingleTouch = evt.nativeEvent.touches.length === 1;
        const isDragging = Math.abs(gestureState.dy) > 20 || Math.abs(gestureState.dx) > 20;
        return isSingleTouch && isDragging;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dy) > 25 || Math.abs(gestureState.dx) > 25) {
          onCloseRef.current();
        }
      },
    })
  ).current;

  if (!photoUrl) return null;

  const resolved = resolvePhotoUrl(photoUrl);
  if (!resolved) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.backdrop} {...panResponder.panHandlers}>
        <ScrollView
          style={styles.flexContainer}
          contentContainerStyle={styles.scrollContent}
          minimumZoomScale={1}
          maximumZoomScale={5}
          bouncesZoom={true}
          centerContent={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={{ uri: resolved }}
            style={styles.image}
            contentFit="contain"
          />
        </ScrollView>

        <Pressable
          style={[styles.closeButton, { top: Math.max(insets.top + 8, 20) }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        >
          <Feather name="x" size={24} color={colors.surface} />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000000",
  },
  flexContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  image: {
    width: "100%",
    height: "100%",
    minHeight: 320,
  },
  closeButton: {
    position: "absolute",
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99,
  },
});
