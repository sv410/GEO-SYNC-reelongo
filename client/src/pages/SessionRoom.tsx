import { useEffect, useState } from "react";
import { useParams, useSearch } from "wouter";
import { MapContainer, TileLayer } from "react-leaflet";
import { useGetSession } from "@/hooks/use-sessions";
import { useMapWebSocket } from "@/hooks/use-websocket";
import { MapHUD } from "@/components/MapHUD";
import { MapSync } from "@/components/MapSync";
import { Loader2 } from "lucide-react";

export default function SessionRoom() {
  const { id } = useParams<{ id: string }>();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const roleRaw = searchParams.get("role");
  
  // Validate role strictly
  const role: "tracker" | "tracked" = roleRaw === "tracker" ? "tracker" : "tracked";
  
  const { data: session, isLoading, error } = useGetSession(id || "");
  const wsState = useMapWebSocket(id || "", role);

  // Local state for the HUD to reflect real-time coords smoothly
  const [currentView, setCurrentView] = useState({ 
    lat: 51.505, 
    lng: -0.09, 
    zoom: 13 
  });

  // When session loads initially, set the center
  useEffect(() => {
    if (session && !wsState.lastLocation) {
      setCurrentView({ lat: session.lat, lng: session.lng, zoom: session.zoom });
    }
  }, [session, wsState.lastLocation]);

  // When WebSocket pushes new locations, update HUD
  useEffect(() => {
    if (wsState.lastLocation) {
      setCurrentView(wsState.lastLocation);
    }
  }, [wsState.lastLocation]);

  const handleTrackerMove = (lat: number, lng: number, zoom: number) => {
    setCurrentView({ lat, lng, zoom });
    wsState.sendLocationUpdate(lat, lng, zoom);
  };

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="font-display font-semibold text-xl animate-pulse">Initializing Geospatial Link...</h2>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
           <span className="font-bold text-2xl">!</span>
        </div>
        <h2 className="font-display font-bold text-2xl mb-2">Session Not Found</h2>
        <p className="text-muted-foreground max-w-md mb-6">The session ID you requested does not exist or could not be loaded.</p>
        <a href="/" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors">
          Return Home
        </a>
      </div>
    );
  }

  // Determine initial center from either WS (if already connected and received state) or the DB Session
  const initCenter: [number, number] = wsState.lastLocation 
    ? [wsState.lastLocation.lat, wsState.lastLocation.lng] 
    : [session.lat, session.lng];
    
  const initZoom = wsState.lastLocation ? wsState.lastLocation.zoom : session.zoom;

  return (
    <div className="w-screen h-screen relative bg-background overflow-hidden">
      
      {/* HUD Overlay */}
      <MapHUD 
        sessionId={session.id}
        role={role}
        wsStatus={wsState.status}
        trackerActive={wsState.trackerActive}
        lat={currentView.lat}
        lng={currentView.lng}
        zoom={currentView.zoom}
      />

      {/* Map Engine */}
      <MapContainer 
        center={initCenter} 
        zoom={initZoom} 
        zoomControl={false} // Hide default zoom controls for cleaner UI
        className="w-full h-full z-0 outline-none"
      >
        {/* Dark-themed Map Tiles (CartoDB Dark Matter) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapSync 
          role={role} 
          onLocationChange={handleTrackerMove}
          externalLocation={wsState.lastLocation}
        />
      </MapContainer>
    </div>
  );
}
