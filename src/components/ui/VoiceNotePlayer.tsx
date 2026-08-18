import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";
import { colors, fontFamily, radius, spacing } from "../../theme";

interface VoiceNotePlayerProps {
  audioUrl?: string | null;
  onDelete?: () => void;
}

const WAVE_BAR_HEIGHTS = [12, 22, 16, 30, 24, 14, 28, 36, 18, 26, 12, 32, 20, 15, 28, 10, 24, 16];

export function VoiceNotePlayer({ audioUrl, onDelete }: VoiceNotePlayerProps) {
  const { accentColor, language } = useAppTheme();
  const [isPlaying, setIsPlaying] = useState(false);

  // Animated values for wave bar pulsation when playing
  const animValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (isPlaying) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1.4,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0.7,
            duration: 350,
            useNativeDriver: true,
          }),
        ])
      );
      animLoop.start();
    } else {
      animValue.setValue(1);
    }
    return () => {
      animLoop?.stop();
    };
  }, [isPlaying, animValue]);

  function togglePlay() {
    setIsPlaying((prev) => !prev);
    if (!isPlaying) {
      // Auto stop after 5 seconds simulation
      setTimeout(() => {
        setIsPlaying(false);
      }, 5000);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.playBtn, { backgroundColor: accentColor }]}
        onPress={togglePlay}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause" : "Play"}
      >
        <Feather name={isPlaying ? "pause" : "play"} size={16} color="#FFFFFF" style={styles.playIcon} />
      </Pressable>

      <View style={styles.waveformContainer}>
        {WAVE_BAR_HEIGHTS.map((height, i) => {
          const isEven = i % 2 === 0;
          const scaleY = isPlaying
            ? animValue.interpolate({
                inputRange: [0.7, 1.4],
                outputRange: isEven ? [0.7, 1.4] : [1.4, 0.7],
              })
            : 1;

          return (
            <Animated.View
              key={i}
              style={[
                styles.waveBar,
                {
                  height,
                  backgroundColor: isPlaying ? accentColor : colors.border,
                  transform: [{ scaleY }],
                },
              ]}
            />
          );
        })}
      </View>

      <Text style={styles.timerText}>0:10</Text>

      {onDelete ? (
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Feather name="trash-2" size={16} color={colors.accentRed} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  playIcon: {
    marginLeft: 2,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: 40,
    paddingHorizontal: spacing.xs,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  timerText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
    minWidth: 30,
    textAlign: "right",
  },
  deleteBtn: {
    padding: spacing.xs,
  },
});
