// DEV: react-native-maps Expo Go'da desteklenmiyor (development build gerektiriyor).
// Orijinal kod geri almak icin asagidaki blok yorumu kaldirin ve placeholder'i silin.
/*
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, type MapPressEvent } from "react-native-maps";
import { radius } from "../../theme";

interface MapLocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
  height?: number;
}

const DEFAULT_DELTA = 0.01;

export function MapLocationPicker({ latitude, longitude, onChange, height = 260 }: MapLocationPickerProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: DEFAULT_DELTA,
        longitudeDelta: DEFAULT_DELTA,
      },
      500
    );
  }, [latitude, longitude]);

  function handlePress(event: MapPressEvent): void {
    onChange(event.nativeEvent.coordinate);
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: DEFAULT_DELTA,
          longitudeDelta: DEFAULT_DELTA,
        }}
        onPress={handlePress}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          draggable
          onDragEnd={(event) => onChange(event.nativeEvent.coordinate)}
        />
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

interface MapLocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
  height?: number;
}

export function MapLocationPicker({ latitude, longitude, height = 260 }: MapLocationPickerProps) {
  return (
    <View style={[styles.container, { height }]}>
      <Text style={styles.text}>
        Harita development build gerektiriyor (Expo Go'da desteklenmiyor).{"\n"}
        {latitude.toFixed(5)}, {longitude.toFixed(5)}
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
