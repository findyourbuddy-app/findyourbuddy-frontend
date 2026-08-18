import { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { useAppTheme } from "../../context/ThemeContext";
import { colors, fontFamily, radius, spacing } from "../../theme";

interface VoiceNotePlayerProps {
  audioUrl?: string | null;
  onDelete?: () => void;
}

const WAVE_BAR_HEIGHTS = [12, 22, 16, 30, 24, 14, 28, 36, 18, 26, 12, 32, 20, 15, 28, 10, 24, 16];

export function VoiceNotePlayer({ audioUrl, onDelete }: VoiceNotePlayerProps) {
  const { accentColor } = useAppTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackDisplay, setPlaybackDisplay] = useState("0:00");
  const webAudioRef = useRef<HTMLAudioElement | null>(null);

  // Expo audio player for native platforms
  const player = useAudioPlayer(audioUrl || "");

  // Web HTML5 Audio setup
  useEffect(() => {
    if (Platform.OS === "web" && audioUrl) {
      const audio = new window.Audio(audioUrl);
      webAudioRef.current = audio;
      audio.onended = () => {
        setIsPlaying(false);
        setPlaybackDisplay("0:00");
      };
      audio.ontimeupdate = () => {
        const secs = Math.floor(audio.currentTime);
        const mins = Math.floor(secs / 60);
        const remSecs = secs % 60;
        setPlaybackDisplay(`${mins}:${remSecs < 10 ? "0" : ""}${remSecs}`);
      };
      return () => {
        audio.pause();
        audio.src = "";
      };
    }
  }, [audioUrl]);

  // Native player state sync
  useEffect(() => {
    if (Platform.OS !== "web" && player) {
      const interval = setInterval(() => {
        if (player.playing) {
          setIsPlaying(true);
          const secs = Math.floor(player.currentTime);
          const mins = Math.floor(secs / 60);
          const remSecs = secs % 60;
          setPlaybackDisplay(`${mins}:${remSecs < 10 ? "0" : ""}${remSecs}`);
        } else if (isPlaying && !player.playing) {
          setIsPlaying(false);
        }
      }, 250);
      return () => clearInterval(interval);
    }
  }, [player, isPlaying]);

  // Waveform pulsation animation
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

  async function togglePlay() {
    if (!audioUrl) return;

    if (Platform.OS === "web") {
      if (webAudioRef.current) {
        if (isPlaying) {
          webAudioRef.current.pause();
          setIsPlaying(false);
        } else {
          try {
            await webAudioRef.current.play();
            setIsPlaying(true);
          } catch {
            setIsPlaying(false);
          }
        }
      }
      return;
    }

    if (player) {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        try {
          player.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      }
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

      <Text style={styles.timerText}>{playbackDisplay}</Text>

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
