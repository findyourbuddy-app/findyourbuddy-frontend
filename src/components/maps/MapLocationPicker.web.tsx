import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { radius } from "../../theme";

interface MapLocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
  height?: number;
}

const MESSAGE_SOURCE = "fyb-map-picker";
const SET_VIEW_SOURCE = "fyb-map-picker-set";

// react-leaflet previously corrupted node_modules/jest resolution badly enough
// that a clean reinstall wasn't enough to fix it (see git history). Loading
// Leaflet from a CDN inside a sandboxed iframe keeps the map fully interactive
// on web (click/drag to pick a point) without adding any npm dependency to
// the app's own bundle.
function buildMapHtml(latitude: number, longitude: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { attributionControl: false }).setView([${latitude}, ${longitude}], 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  var marker = L.marker([${latitude}, ${longitude}], { draggable: true }).addTo(map);

  function notify(lat, lng) {
    window.parent.postMessage({ source: '${MESSAGE_SOURCE}', latitude: lat, longitude: lng }, '*');
  }

  marker.on('dragend', function () {
    var pos = marker.getLatLng();
    notify(pos.lat, pos.lng);
  });

  map.on('click', function (event) {
    marker.setLatLng(event.latlng);
    notify(event.latlng.lat, event.latlng.lng);
  });

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (data && data.source === '${SET_VIEW_SOURCE}' && typeof data.latitude === 'number') {
      var latlng = [data.latitude, data.longitude];
      marker.setLatLng(latlng);
      map.setView(latlng, map.getZoom());
    }
  });
</script>
</body>
</html>`;
}

export function MapLocationPicker({ latitude, longitude, onChange, height = 260 }: MapLocationPickerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // The iframe's srcDoc is only built once from the initial coordinates --
  // rebuilding it on every lat/lng change would reload the whole map (losing
  // zoom/pan). Later position changes go through postMessage instead.
  const initialCenterRef = useRef({ latitude, longitude });
  const html = useMemo(
    () => buildMapHtml(initialCenterRef.current.latitude, initialCenterRef.current.longitude),
    []
  );

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (data && data.source === MESSAGE_SOURCE && typeof data.latitude === "number") {
        onChange({ latitude: data.latitude, longitude: data.longitude });
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onChange]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { source: SET_VIEW_SOURCE, latitude, longitude },
      "*"
    );
  }, [latitude, longitude]);

  return (
    <View style={[styles.container, { height }]}>
      <iframe ref={iframeRef} srcDoc={html} style={{ border: 0, width: "100%", height: "100%" }} title="Konum haritası" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
});
