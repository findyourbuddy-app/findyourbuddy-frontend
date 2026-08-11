import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listMyMatches } from "../api/matches";
import type { Match } from "../types";

export function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMatches = useCallback(async () => {
    setIsRefreshing(true);
    try {
      setMatches(await listMyMatches());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [loadMatches])
  );

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={matches}
      keyExtractor={(match) => String(match.id)}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadMatches} />}
      ListEmptyComponent={<Text style={styles.empty}>Henüz eşleşmen yok.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Eşleşme #{item.id}</Text>
          <Text style={styles.cardSubtitle}>Uyum skoru: {Math.round(item.score * 100)}%</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardSubtitle: { color: "#666", marginTop: 4 },
  empty: { textAlign: "center", color: "#666", marginTop: 40 },
});
