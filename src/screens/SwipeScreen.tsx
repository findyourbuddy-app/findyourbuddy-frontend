import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createSwipe, getSwipeCandidates } from "../api/swipes";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { SwipeDirection, User } from "../types";

type Props = NativeStackScreenProps<MainStackParamList, "Swipe">;

export function SwipeScreen({ route }: Props) {
  const { eventId } = route.params;
  const [candidates, setCandidates] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSwipeCandidates(eventId)
      .then(setCandidates)
      .finally(() => setIsLoading(false));
  }, [eventId]);

  async function handleSwipe(direction: SwipeDirection): Promise<void> {
    const target = candidates[currentIndex];
    if (!target) {
      return;
    }
    await createSwipe({ target_id: target.id, event_id: eventId, direction });
    setCurrentIndex((index) => index + 1);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const candidate = candidates[currentIndex];

  if (!candidate) {
    return (
      <View style={styles.center}>
        <Text>Bu etkinlik için başka aday kalmadı.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{candidate.display_name}</Text>
        {candidate.age ? <Text style={styles.meta}>{candidate.age} yaşında</Text> : null}
        {candidate.bio ? <Text style={styles.bio}>{candidate.bio}</Text> : null}
        {candidate.interests.length > 0 ? (
          <Text style={styles.meta}>{candidate.interests.join(" · ")}</Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.pass]} onPress={() => handleSwipe("pass")}>
          <Text style={styles.actionText}>Geç</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.like]} onPress={() => handleSwipe("like")}>
          <Text style={styles.actionText}>Beğen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "space-between" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "#eee", padding: 20, justifyContent: "center" },
  name: { fontSize: 24, fontWeight: "700" },
  meta: { color: "#666", marginTop: 8 },
  bio: { marginTop: 12, fontSize: 16 },
  actions: { flexDirection: "row", gap: 16, paddingVertical: 20 },
  actionButton: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  pass: { backgroundColor: "#e0e0e0" },
  like: { backgroundColor: "#ff5864" },
  actionText: { fontWeight: "700", fontSize: 16 },
});
