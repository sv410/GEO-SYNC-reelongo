import { useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";

interface MapSyncProps {
  role: "tracker" | "tracked";
  onLocationChange?: (lat: number, lng: number, zoom: number) => void;
  externalLocation?: { lat: number; lng: number; zoom: number } | null;
}

export function MapSync({ role, onLocationChange, externalLocation }: MapSyncProps) {
  const map = useMap();

  // TRACKER ROLE: Listen to map interactions and notify parent
  useMapEvents({
    moveend: () => {
      if (role === "tracker" && onLocationChange) {
        const center = map.getCenter();
        onLocationChange(center.lat, center.lng, map.getZoom());
      }
    },
    zoomend: () => {
      if (role === "tracker" && onLocationChange) {
        const center = map.getCenter();
        onLocationChange(center.lat, center.lng, map.getZoom());
      }
    }
  });

  // TRACKED ROLE: Listen to external location updates and animate map
  useEffect(() => {
    if (role === "tracked" && externalLocation) {
      // Check if we actually need to move (prevent infinite loops if precision varies slightly)
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      
      const distance = currentCenter.distanceTo([externalLocation.lat, externalLocation.lng]);
      const zoomDiff = Math.abs(currentZoom - externalLocation.zoom);

      // Only fly if we are off by more than 5 meters or zoom is different
      if (distance > 5 || zoomDiff > 0.1) {
        map.flyTo(
          [externalLocation.lat, externalLocation.lng], 
          externalLocation.zoom, 
          { duration: 0.6, easeLinearity: 0.5 }
        );
      }
    }
  }, [externalLocation, role, map]);

  return null;
}
