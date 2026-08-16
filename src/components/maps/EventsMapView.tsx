import { StyleSheet, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { colors, radius } from "../../theme";
import type { Event } from "../../types";

interface EventsMapViewProps {
  events: Event[];
  centerLatitude: number;
  centerLongitude: number;
  onSelectEvent: (event: Event) => void;
  selectedEventId?: number | null;
  height?: number;
}

const DEFAULT_DELTA = 0.05;

export function EventsMapView({
  events,
  centerLatitude,
  centerLongitude,
  onSelectEvent,
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
      <MapView style={StyleSheet.absoluteFill} initialRegion={region}>
        {events.map((event) => (
          <Marker
            key={event.id}
            coordinate={{ latitude: event.latitude, longitude: event.longitude }}
            title={event.title}
            description={event.location_name}
            pinColor={selectedEventId === event.id ? colors.accentYellow : undefined}
            onPress={() => onSelectEvent(event)}
          />
        ))}
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
