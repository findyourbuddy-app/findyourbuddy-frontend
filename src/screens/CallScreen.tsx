import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
} from "firebase/firestore";
import { setAudioModeAsync } from "expo-audio";
import {
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
  mediaDevices,
} from "react-native-webrtc";
import { db } from "../config/firebase";
import { fetchIceServers, type IceServer } from "../api/calls";
import { Avatar } from "../components/ui/Avatar";
import { colors, fontFamily, radius, shadows, spacing } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";

const FALLBACK_ICE_SERVERS: IceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type Props = NativeStackScreenProps<MainStackParamList, "Call">;

export function CallScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<Props["route"]>();
  const { matchId, otherUserName, otherUserPhoto, isCaller, callType } = route.params;

  const [callStatus, setCallStatus] = useState<"ringing" | "connected" | "ended">("ringing");
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(callType === "video");
  const [isVideoOn, setIsVideoOn] = useState(callType === "video");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const endedRef = useRef(false);

  const signalDocRef = doc(db, "matches", String(matchId), "call", "signal");
  const callerIceCol = collection(db, "matches", String(matchId), "ice_caller");
  const calleeIceCol = collection(db, "matches", String(matchId), "ice_callee");

  const teardown = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    Promise.all([getDocs(callerIceCol), getDocs(calleeIceCol)])
      .then(([callerSnap, calleeSnap]) =>
        Promise.all([
          ...callerSnap.docs.map((d) => deleteDoc(d.ref)),
          ...calleeSnap.docs.map((d) => deleteDoc(d.ref)),
        ])
      )
      .catch(() => {});
  }, []);

  const handleCallEndedLocally = useCallback(() => {
    teardown();
    setCallStatus("ended");
    setTimeout(() => navigation.goBack(), 1200);
  }, [navigation, teardown]);

  // Duration timer
  useEffect(() => {
    if (callStatus !== "connected") return;
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  // Firestore signal listener (status updates)
  useEffect(() => {
    const unsub = onSnapshot(
      signalDocRef,
      (snap) => {
        if (!snap.exists()) {
          handleCallEndedLocally();
          return;
        }
        const data = snap.data();
        if (data.status === "ended" || data.status === "declined") {
          handleCallEndedLocally();
        } else if (data.status === "connected") {
          setCallStatus("connected");
        }
      },
      () => handleCallEndedLocally()
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WebRTC setup — runs once on mount
  useEffect(() => {
    let unsubAnswer: (() => void) | undefined;
    let unsubIce: (() => void) | undefined;

    async function setup() {
      await setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: true,
      }).catch(() => {});

      const iceServers = await fetchIceServers().catch(() => FALLBACK_ICE_SERVERS);
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      const stream = (await mediaDevices.getUserMedia({
        audio: true,
        video:
          callType === "video"
            ? { facingMode: "user", width: 640, height: 480 }
            : false,
      })) as MediaStream;

      setLocalStream(stream);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.addEventListener("track", (event: any) => {
        if (event.streams?.[0]) {
          setRemoteStream(event.streams[0] as MediaStream);
        }
      });

      pc.addEventListener("connectionstatechange", () => {
        const state = (pc as any).connectionState as string;
        if (state === "connected") {
          setCallStatus("connected");
        } else if (state === "failed" || state === "disconnected") {
          handleCallEndedLocally();
        }
      });

      const myIceCol = isCaller ? callerIceCol : calleeIceCol;
      pc.addEventListener("icecandidate", (event: any) => {
        if (event.candidate) {
          addDoc(myIceCol, event.candidate.toJSON()).catch(() => {});
        }
      });

      if (isCaller) {
        const offer = await pc.createOffer({});
        await pc.setLocalDescription(offer);
        await updateDoc(signalDocRef, {
          offer: { type: offer.type, sdp: offer.sdp },
        });

        unsubAnswer = onSnapshot(signalDocRef, async (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          if (data.answer && !pc.remoteDescription) {
            await pc
              .setRemoteDescription(new RTCSessionDescription(data.answer))
              .catch(() => {});
          }
        });

        unsubIce = onSnapshot(query(calleeIceCol), (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              await pc
                .addIceCandidate(
                  new RTCIceCandidate(change.doc.data() as any)
                )
                .catch(() => {});
            }
          });
        });
      } else {
        // Callee: read existing offer then create answer
        const sigSnap = await new Promise<any>((resolve) => {
          const unsub = onSnapshot(signalDocRef, (s) => {
            resolve(s);
            unsub();
          });
        });

        const offer = sigSnap.data()?.offer;
        if (offer) {
          await pc
            .setRemoteDescription(new RTCSessionDescription(offer))
            .catch(() => {});
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await updateDoc(signalDocRef, {
          answer: { type: answer.type, sdp: answer.sdp },
          status: "connected",
        });

        unsubIce = onSnapshot(query(callerIceCol), (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              await pc
                .addIceCandidate(
                  new RTCIceCandidate(change.doc.data() as any)
                )
                .catch(() => {});
            }
          });
        });
      }
    }

    setup().catch(() => handleCallEndedLocally());

    return () => {
      unsubAnswer?.();
      unsubIce?.();
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Android hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleHangUp();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleHangUp() {
    try {
      await updateDoc(signalDocRef, { status: "ended" });
      await deleteDoc(signalDocRef);
    } catch {}
    handleCallEndedLocally();
  }

  function toggleMute() {
    const next = !isMuted;
    setIsMuted(next);
    localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
  }

  function toggleVideo() {
    const next = !isVideoOn;
    setIsVideoOn(next);
    localStream?.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
  }

  function toggleSpeaker() {
    const next = !isSpeakerOn;
    setIsSpeakerOn(next);
    setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: !isMuted,
    }).catch(() => {});
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m < 10 ? "0" : ""}${m}:${sec < 10 ? "0" : ""}${sec}`;
  }

  const remoteStreamURL = remoteStream ? (remoteStream as any).toURL() : null;
  const localStreamURL = localStream ? (localStream as any).toURL() : null;

  return (
    <View style={styles.background}>
      {callType === "video" && callStatus === "connected" ? (
        <View style={styles.videoContainer}>
          {remoteStreamURL ? (
            <RTCView
              streamURL={remoteStreamURL}
              style={styles.remoteVideo}
              objectFit="cover"
            />
          ) : (
            <View style={styles.mainVideoStream}>
              <Avatar name={otherUserName} photoUrl={otherUserPhoto} size={120} />
              <Text style={styles.videoOverlayText}>{otherUserName}</Text>
            </View>
          )}
          {localStreamURL && isVideoOn ? (
            <RTCView
              streamURL={localStreamURL}
              style={styles.localVideo}
              objectFit="cover"
              mirror
            />
          ) : (
            <View style={styles.miniVideoStream}>
              <Feather name="video-off" size={20} color={colors.surface} />
              <Text style={styles.miniVideoText}>Sen</Text>
            </View>
          )}
        </View>
      ) : (
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

      <View style={styles.controlsRow}>
        <Pressable
          style={[styles.circleButton, isMuted && styles.circleButtonActive]}
          onPress={toggleMute}
        >
          <Feather
            name={isMuted ? "mic-off" : "mic"}
            size={22}
            color={isMuted ? colors.surface : colors.textPrimary}
          />
        </Pressable>

        {callType === "video" && (
          <Pressable
            style={[styles.circleButton, !isVideoOn && styles.circleButtonActive]}
            onPress={toggleVideo}
          >
            <Feather
              name={isVideoOn ? "video" : "video-off"}
              size={22}
              color={isVideoOn ? colors.textPrimary : colors.surface}
            />
          </Pressable>
        )}

        <Pressable
          style={[styles.circleButton, isSpeakerOn && styles.circleButtonActive]}
          onPress={toggleSpeaker}
        >
          <Feather
            name="volume-2"
            size={22}
            color={isSpeakerOn ? colors.surface : colors.textPrimary}
          />
        </Pressable>

        <Pressable
          style={[styles.circleButton, styles.hangupButton]}
          onPress={handleHangUp}
        >
          <Feather name="phone-off" size={22} color={colors.surface} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#0B071E",
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
  remoteVideo: {
    flex: 1,
    width: "100%",
    backgroundColor: "#16113A",
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
  localVideo: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 100,
    height: 140,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.surface,
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
