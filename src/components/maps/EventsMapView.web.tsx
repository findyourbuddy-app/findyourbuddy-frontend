import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { radius } from "../../theme";
import type { Event } from "../../types";

interface EventsMapViewProps {
  events: Event[];
  centerLatitude: number;
  centerLongitude: number;
  onSelectEvent: (event: Event) => void;
  selectedEventId?: number | null;
  height?: number;
}

const MESSAGE_SOURCE = "fyb-events-map";

function escapeForJs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ");
}

// Same CDN-in-iframe technique as MapLocationPicker.web.tsx -- react-leaflet
// as an npm dependency previously corrupted node_modules/jest badly enough
// that a clean reinstall didn't fix it, so this avoids adding it back.
function buildMapHtml(centerLat: number, centerLng: number, events: Event[]): string {
  const markersJs = events
    .map(
      (event) => `
        (function () {
          var marker = L.marker([${event.latitude}, ${event.longitude}]).addTo(map);
          marker.bindTooltip('${escapeForJs(event.title)}');
          marker.on('click', function () {
            window.parent.postMessage({ source: '${MESSAGE_SOURCE}', eventId: ${event.id} }, '*');
          });
        })();`
    )
    .join("\n");

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
  var map = L.map('map', { attributionControl: false }).setView([${centerLat}, ${centerLng}], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  ${markersJs}
</script>
</body>
</html>`;
}

export function EventsMapView({
  events,
  centerLatitude,
  centerLongitude,
  onSelectEvent,
  height = 320,
}: EventsMapViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const eventsKey = events.map((event) => event.id).join(",");

  const html = useMemo(
    () => buildMapHtml(centerLatitude, centerLongitude, events),
    // Rebuild only when the actual set of pins or the center changes, not on
    // every render (would reset zoom/pan otherwise).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventsKey, centerLatitude, centerLongitude]
  );

  useEffect(() => {
    function handleMessage(messageEvent: MessageEvent) {
      const data = messageEvent.data;
      if (data && data.source === MESSAGE_SOURCE && typeof data.eventId === "number") {
        const found = events.find((event) => event.id === data.eventId);
        if (found) onSelectEvent(found);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [events, onSelectEvent]);

  return (
    <View style={[styles.container, { height }]}>
      <iframe ref={iframeRef} srcDoc={html} style={{ border: 0, width: "100%", height: "100%" }} title="Etkinlik haritası" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
});
