import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BuddyLogo } from "./BuddyLogo";
import { fontFamily } from "../../theme";

export function AppSplashScreen() {
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#E3F7FA", "#F8F9FE", "#FFF0EB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.blobTopLeft} />
      <View style={styles.blobBottomRight} />

      <View style={styles.centerContainer}>
        <BuddyLogo size={100} showText={true} />
        <Text style={styles.tagline}>Kankanı bulmanın en kolay yolu</Text>
        <ActivityIndicator size="large" color="#FF6B6B" style={styles.spinner} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FE",
  },
  blobTopLeft: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(74, 194, 226, 0.22)",
  },
  blobBottomRight: {
    position: "absolute",
    bottom: -80,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255, 107, 107, 0.18)",
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  tagline: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: "#64748B",
    marginTop: 12,
    letterSpacing: 0.2,
  },
  spinner: {
    marginTop: 32,
  },
});
