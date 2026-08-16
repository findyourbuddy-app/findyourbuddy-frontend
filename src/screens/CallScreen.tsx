import { useEffect, useState, useRef } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { Alert } from "../utils/alert";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { doc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { Avatar } from "../components/ui/Avatar";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "Call">;

export function CallScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<Props["route"]>();
  const { matchId, otherUserName, otherUserPhoto, isCaller, callType } = route.params;

  const [callStatus, setCallStatus] = useState<"ringing" | "connected" | "ended">("ringing");
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === "video");

  const timerRef = useRef<any>(null);

  // Call status updates from Firestore signaling doc
  useEffect(() => {
    const docRef = doc(db, "matches", String(matchId), "call", "signal");

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Doc deleted means call ended
        handleCallEndedLocally();
        return;
      }
      const data = snapshot.data();
      if (data.status === "ended" || data.status === "declined") {
        handleCallEndedLocally();
      } else if (data.status === "connected") {
        setCallStatus("connected");
      }
    }, () => {
      handleCallEndedLocally();
    });

    return () => {
      unsubscribe();
    };
  }, [matchId]);

  // Duration timer when call is connected
  useEffect(() => {
    if (callStatus === "connected") {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  // Handle hardware back button on Android
  useEffect(() => {
    const onBackPress = () => {
      handleHangUp();
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, []);

  async function handleHangUp() {
    const docRef = doc(db, "matches", String(matchId), "call", "signal");
    try {
      await updateDoc(docRef, { status: "ended" });
      await deleteDoc(docRef);
    } catch {}
    handleCallEndedLocally();
  }

  function handleCallEndedLocally() {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallStatus("ended");
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  }

  function formatTime(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  return (
    <View style={styles.background}>
      {isVideoOn && callStatus === "connected" ? (
        // Video Streams Container
        <View style={styles.videoContainer}>
          {/* Main stream mockup (other user) */}
          <View style={styles.mainVideoStream}>
            <Avatar name={otherUserName} photoUrl={otherUserPhoto} size={120} />
            <Text style={styles.videoOverlayText}>{otherUserName}</Text>
          </View>
          {/* Mini preview mockup (local camera) */}
          <View style={styles.miniVideoStream}>
            <Feather name="video" size={20} color={colors.surface} />
            <Text style={styles.miniVideoText}>Sen</Text>
          </View>
        </View>
      ) : (
        // Voice Call / Calling Screen Container
        <View style={styles.voiceContainer}>
          <Avatar name={otherUserName} photoUrl={otherUserPhoto} size={128} />
          <Text style={styles.nameText}>{otherUserName}</Text>
          
          <Text style={styles.statusText}>
            {callStatus === "ringing"
              ? isCaller
                ? "Aranıyor..."
                : "Gelen Arama..."
              : `Bağlandı - ${formatTime(seconds)}`}
          </Text>
        </View>
      )}

      {/* Control Buttons Overlay */}
      <View style={styles.controlsRow}>
        {/* Mute Microphone */}
        <Pressable
          style={[styles.circleButton, isMuted && styles.circleButtonActive]}
          onPress={() => setIsMuted(!isMuted)}
        >
          <Feather name={isMuted ? "mic-off" : "mic"} size={22} color={isMuted ? colors.surface : colors.textPrimary} />
        </Pressable>

        {/* Video Toggle (only for video calls) */}
        {callType === "video" && (
          <Pressable
            style={[styles.circleButton, !isVideoOn && styles.circleButtonActive]}
            onPress={() => setIsVideoOn(!isVideoOn)}
          >
            <Feather name={isVideoOn ? "video" : "video-off"} size={22} color={isVideoOn ? colors.textPrimary : colors.surface} />
          </Pressable>
        )}

        {/* Speaker Toggle */}
        <Pressable
          style={[styles.circleButton, isSpeakerOn && styles.circleButtonActive]}
          onPress={() => setIsSpeakerOn(!isSpeakerOn)}
        >
          <Feather name="volume-2" size={22} color={isSpeakerOn ? colors.surface : colors.textPrimary} />
        </Pressable>

        {/* Hang Up Button (Red) */}
        <Pressable style={[styles.circleButton, styles.hangupButton]} onPress={handleHangUp}>
          <Feather name="phone-off" size={22} color={colors.surface} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#0B071E", // Sleek dark midnight theme
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 60,
  },
  voiceContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  nameText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 24,
    color: colors.surface,
  },
  statusText: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
  },
  videoContainer: {
    flex: 1,
    width: "100%",
    position: "relative",
  },
  mainVideoStream: {
    flex: 1,
    backgroundColor: "#16113A",
    justifyContent: "center",
    alignItems: "center",
  },
  videoOverlayText: {
    position: "absolute",
    bottom: 20,
    left: 20,
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 18,
    color: colors.surface,
  },
  miniVideoStream: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 100,
    height: 140,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.surface,
    ...shadows.card,
  },
  miniVideoText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.surface,
    marginTop: 4,
  },
  controlsRow: {
    flexDirection: "row",
    gap: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: spacing.xl,
  },
  circleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleButtonActive: {
    backgroundColor: colors.primary,
  },
  hangupButton: {
    backgroundColor: colors.accentRed,
  },
});
