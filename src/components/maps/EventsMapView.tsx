// DEV: react-native-maps Expo Go'da desteklenmiyor (development build gerektiriyor).
// Orijinal kod geri almak icin asagidaki blok yorumu kaldirin ve placeholder'i silin.
/*
import { StyleSheet, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { colors, radius } from "../../theme";
import type { Event } from "../../types";

interface EventsMapViewProps {
  events: Event[];
  centerLatitude: number;
  centerLongitude: number;
  onSelectEvent: (event: Event) => void;
  onDeselectEvent?: () => void;
  selectedEventId?: number | null;
  height?: number;
}

const DEFAULT_DELTA = 0.05;

export function EventsMapView({
  events,
  centerLatitude,
  centerLongitude,
  onSelectEvent,
  onDeselectEvent,
  selectedEventId,
  height = 320,
}: EventsMapViewProps) {
  const region: Region = {
    latitude: centerLatitude,
    longitude: centerLongitude,
    latitudeDelta: DEFAULT_DELTA,
    longitudeDelta: DEFAULT_DELTA,
  };

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        onPress={(e) => {
          if (e.nativeEvent.action !== "marker-press") {
            onDeselectEvent?.();
          }
        }}
      >
        {events.map((event) => {
          const isUserCreated = Boolean(event.creator_id) && !event.source;
          const isSelected = selectedEventId === event.id;

          // Red marker for user-created events, Violet/Blue for system events, Gold for selected
          const pinColor = isSelected
            ? "#FFD166"
            : isUserCreated
            ? "#FF4D5E"
            : "#6C4CF1";

          return (
            <Marker
              key={event.id}
              coordinate={{ latitude: event.latitude, longitude: event.longitude }}
              pinColor={pinColor}
              title={event.title}
              description={isUserCreated ? "Kullanıcı Etkinliği" : "Sistem Etkinliği"}
              onPress={(e) => {
                e.stopPropagation();
                onSelectEvent(event);
              }}
            />
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
});
*/

import { StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, radius } from "../../theme";
import type { Event } from "../../types";

interface EventsMapViewProps {
  events: Event[];
  centerLatitude: number;
  centerLongitude: number;
  onSelectEvent: (event: Event) => void;
  onDeselectEvent?: () => void;
  selectedEventId?: number | null;
  height?: number;
}

export function EventsMapView({ events, height = 320 }: EventsMapViewProps) {
  return (
    <View style={[styles.container, { height }]}>
      <Text style={styles.text}>
        Harita development build gerektiriyor (Expo Go'da desteklenmiyor). {events.length} etkinlik mevcut.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  text: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: "center",
  },
});
