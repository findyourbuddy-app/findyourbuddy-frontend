import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { fontFamily } from "../../theme";

interface BuddyLogoProps {
  size?: number;
  showText?: boolean;
}

export function BuddyLogo({ size = 84, showText = true }: BuddyLogoProps) {
  const headSize = Math.round(size * 0.22);
  const heartSize = Math.round(size * 0.24);

  return (
    <View style={styles.container}>
      {/* Symbol Section */}
      <View style={[styles.symbolContainer, { width: size * 1.3, height: size }]}>
        {/* Floating Heart at top center */}
        <View style={[styles.heartBadge, { top: -4 }]}>
          <Feather name="heart" size={heartSize} color="#FF6B6B" style={{ transform: [{ scale: 1.1 }] }} />
        </View>

        <View style={styles.headsRow}>
          {/* Left Head */}
          <View style={[styles.headCircle, { width: headSize, height: headSize, borderRadius: headSize / 2, backgroundColor: "#4AC2E2" }]} />
          {/* Right Head */}
          <View style={[styles.headCircle, { width: headSize, height: headSize, borderRadius: headSize / 2, backgroundColor: "#FF6B6B" }]} />
        </View>

        {/* Interlocking Infinity Loop Body */}
        <View style={styles.infinityContainer}>
          {/* Left Loop Body */}
          <View style={[styles.loopLeft, { borderColor: "#4AC2E2", width: size * 0.52, height: size * 0.45 }]} />
          {/* Right Loop Body */}
          <View style={[styles.loopRight, { borderColor: "#FF6B6B", width: size * 0.52, height: size * 0.45 }]} />
          {/* Center Connection Heart Icon Overlay */}
          <View style={styles.centerNode}>
            <View style={styles.centerNodeDot} />
          </View>
        </View>
      </View>

      {/* Brand Text */}
      {showText && (
        <View style={styles.textRow}>
          <Text style={styles.brandFindYour}>FindYour</Text>
          <Text style={styles.brandBuddy}>Buddy</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  symbolContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  heartBadge: {
    position: "absolute",
    zIndex: 10,
  },
  headsRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 14,
    zIndex: 5,
  },
  headCircle: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  infinityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -8,
    position: "relative",
  },
  loopLeft: {
    borderWidth: 5,
    borderRadius: 28,
    marginRight: -14,
    transform: [{ rotate: "-20deg" }],
  },
  loopRight: {
    borderWidth: 5,
    borderRadius: 28,
    marginLeft: -14,
    transform: [{ rotate: "20deg" }],
  },
  centerNode: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  centerNodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B6B",
  },
  textRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  brandFindYour: {
    fontFamily: fontFamily.displayBold,
    fontSize: 30,
    fontWeight: "700",
    color: "#1B4958",
    letterSpacing: -0.5,
  },
  brandBuddy: {
    fontFamily: fontFamily.displayBold,
    fontSize: 30,
    fontWeight: "700",
    color: "#FF6B6B",
    letterSpacing: -0.5,
  },
});
