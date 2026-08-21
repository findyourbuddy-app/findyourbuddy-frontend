import { Modal, Pressable, StatusBar, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { resolvePhotoUrl } from "../ui/Avatar";
import { colors } from "../../theme";

interface PhotoLightboxModalProps {
  visible: boolean;
  photoUrl: string | null;
  onClose: () => void;
}

export function PhotoLightboxModal({ visible, photoUrl, onClose }: PhotoLightboxModalProps) {
  const insets = useSafeAreaInsets();

  if (!photoUrl) return null;

  const resolved = resolvePhotoUrl(photoUrl);
  if (!resolved) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar hidden />
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Image source={{ uri: resolved }} style={styles.image} contentFit="contain" />
        <Pressable
          style={[styles.closeButton, { top: insets.top + 12 }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        >
          <Feather name="x" size={22} color={colors.surface} />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "80%",
  },
  closeButton: {
    position: "absolute",
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
