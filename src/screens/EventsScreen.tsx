import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { listEvents } from "../api/events";
import type { MainStackParamList, MainTabParamList } from "../navigation/RootNavigator";
import type { Event } from "../types";

type EventsNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Events">,
  NativeStackNavigationProp<MainStackParamList>
>;

export function EventsScreen() {
  const navigation = useNavigation<EventsNavigationProp>();
  const [events, setEvents] = useState<Event[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadEvents = useCallback(async () => {
    setIsRefreshing(true);
    try {
      setEvents(await listEvents());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={events}
      keyExtractor={(event) => String(event.id)}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadEvents} />}
      ListEmptyComponent={<Text style={styles.empty}>Yaklaşan etkinlik yok.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("Swipe", { eventId: item.id, eventTitle: item.title })}
        >
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSubtitle}>
            {item.category} · {item.location_name}
          </Text>
        </TouchableOpacity>
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
