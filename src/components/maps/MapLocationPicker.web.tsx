import { StyleSheet, View } from "react-native";
import { radius } from "../../theme";

interface MapLocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
  height?: number;
}

const DELTA = 0.01;

export function MapLocationPicker({ latitude, longitude, height = 220 }: MapLocationPickerProps) {
  const bbox = [longitude - DELTA, latitude - DELTA, longitude + DELTA, latitude + DELTA].join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${latitude},${longitude}&layer=mapnik`;

  return (
    <View style={[styles.container, { height }]}>
      <iframe src={src} style={{ border: 0, width: "100%", height: "100%" }} loading="lazy" title="Konum haritası" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
});
