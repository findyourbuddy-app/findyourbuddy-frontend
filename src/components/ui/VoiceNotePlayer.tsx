import { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useAppTheme } from "../../context/ThemeContext";
import { colors, fontFamily, radius, spacing } from "../../theme";

interface VoiceNotePlayerProps {
  audioUrl?: string | null;
  durationSeconds?: number;
  onDelete?: () => void;
}

const WAVE_BAR_HEIGHTS = [12, 22, 16, 30, 24, 14, 28, 36, 18, 26, 12, 32, 20, 15, 28, 10, 24, 16];

function parseSeconds(dur: number): number {
  if (!dur || isNaN(dur) || dur <= 0) return 0;
  return dur > 1000 ? dur / 1000 : dur;
}

function formatTime(totalSecs: number): string {
  const secsVal = parseSeconds(totalSecs);
  if (secsVal <= 0) return "0:00";
  const mins = Math.floor(secsVal / 60);
  const secs = Math.floor(secsVal % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function VoiceNotePlayer({ audioUrl, durationSeconds, onDelete }: VoiceNotePlayerProps) {
  const { accentColor } = useAppTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalDuration, setTotalDuration] = useState<number>(durationSeconds || 0);
  const [playbackDisplay, setPlaybackDisplay] = useState(formatTime(durationSeconds || 0));
  const webAudioRef = useRef<HTMLAudioElement | null>(null);

  // Expo audio player for native platforms
  const player = useAudioPlayer(audioUrl || "");

  // Load/replace audio source on native player when audioUrl changes
  useEffect(() => {
    if (Platform.OS !== "web" && player && audioUrl) {
      try {
        player.replace({ uri: audioUrl });
      } catch {
        // Best effort
      }
    }
  }, [player, audioUrl]);

  // Continuously check player duration when idle to populate duration immediately (e.g. 0:14)
  useEffect(() => {
    if (Platform.OS === "web" || !player) return;

    const checkDuration = () => {
      const dur = player.duration;
      if (dur && dur > 0) {
        setTotalDuration(dur);
        if (!isPlaying) {
          setPlaybackDisplay(formatTime(dur));
        }
      }
    };

    checkDuration();
    const interval = setInterval(checkDuration, 300);
    return () => clearInterval(interval);
  }, [player, isPlaying]);

  // Web HTML5 Audio setup
  useEffect(() => {
    if (Platform.OS === "web" && audioUrl) {
      const audio = new window.Audio(audioUrl);
      webAudioRef.current = audio;
      
      const updateDuration = () => {
        if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          setTotalDuration(audio.duration);
          if (!isPlaying) {
            setPlaybackDisplay(formatTime(audio.duration));
          }
        }
      };

      audio.onloadedmetadata = updateDuration;
      audio.oncanplaythrough = updateDuration;
      audio.load();

      audio.onended = () => {
        setIsPlaying(false);
        setPlaybackDisplay(formatTime(audio.duration || totalDuration));
      };
      
      audio.ontimeupdate = () => {
        if (audio.currentTime > 0) {
          setPlaybackDisplay(formatTime(audio.currentTime));
        }
      };

      return () => {
        audio.pause();
        audio.src = "";
      };
    }
  }, [audioUrl, totalDuration, isPlaying]);

  // Native player state sync -- only polls while playing
  useEffect(() => {
    if (Platform.OS === "web" || !player || !isPlaying) {
      return;
    }
    const interval = setInterval(() => {
      if (player.playing) {
        setPlaybackDisplay(formatTime(player.currentTime));
      } else {
        setIsPlaying(false);
        setPlaybackDisplay(formatTime(player.duration || totalDuration));
      }
    }, 200);
    return () => clearInterval(interval);
  }, [player, isPlaying, totalDuration]);

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

    // Route audio to main loudspeaker in silent mode
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    } catch {
      // Ignore fallback on unsupported platforms
    }

    if (Platform.OS === "web") {
      if (webAudioRef.current) {
        if (isPlaying) {
          webAudioRef.current.pause();
          setIsPlaying(false);
          setPlaybackDisplay(formatTime(webAudioRef.current.duration || totalDuration));
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
        setPlaybackDisplay(formatTime(player.duration || totalDuration));
      } else {
        try {
          const cur = parseSeconds(player.currentTime);
          const dur = parseSeconds(player.duration);
          if (cur >= (dur || 1) - 0.2) {
            player.seekTo(0);
          }
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
