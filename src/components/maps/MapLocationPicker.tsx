import { StyleSheet, View } from "react-native";
import MapView, { Marker, type MapPressEvent, type Region } from "react-native-maps";
import { radius } from "../../theme";

interface MapLocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
  height?: number;
}

const DEFAULT_DELTA = 0.01;

export function MapLocationPicker({ latitude, longitude, onChange, height = 260 }: MapLocationPickerProps) {
  const region: Region = {
    latitude,
    longitude,
    latitudeDelta: DEFAULT_DELTA,
    longitudeDelta: DEFAULT_DELTA,
  };

  function handlePress(event: MapPressEvent): void {
    onChange(event.nativeEvent.coordinate);
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView style={StyleSheet.absoluteFill} region={region} onPress={handlePress}>
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
