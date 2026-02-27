import { useState, useEffect, useRef, useCallback } from "react";
import { ws } from "@shared/routes";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

type SyncedLocation = {
  lat: number;
  lng: number;
  zoom: number;
  tilt: number;
};

export function useMapWebSocket(sessionId: string, role: "tracker" | "tracked") {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [trackerActive, setTrackerActive] = useState<boolean>(false);
  const [lastLocation, setLastLocation] = useState<SyncedLocation | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [avgLatencyMs, setAvgLatencyMs] = useState<number | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingUpdateRef = useRef<SyncedLocation | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latencySamplesRef = useRef<number[]>([]);

  const flushUpdate = useCallback(() => {
    if (role !== "tracker") return;
    if (!pendingUpdateRef.current) return;
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;

    const next = pendingUpdateRef.current;
    pendingUpdateRef.current = null;

    wsRef.current.send(JSON.stringify({
      type: "update-location",
      payload: {
        sessionId,
        lat: next.lat,
        lng: next.lng,
        zoom: next.zoom,
        tilt: next.tilt,
        sentAt: Date.now(),
      },
    }));

    throttleTimeoutRef.current = setTimeout(() => {
      throttleTimeoutRef.current = null;
      flushUpdate();
    }, 80);
  }, [role, sessionId]);

  const connect = useCallback(() => {
    setStatus("connecting");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setStatus("connected");
      // Join the session
      const joinMsg = {
        type: 'join-session',
        payload: { sessionId, role }
      };
      socket.send(JSON.stringify(joinMsg));
    };

    socket.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);

        if (type === 'location-updated') {
          const data = ws.receive.locationUpdated.parse(payload);
          setLastLocation(data);

          const measuredLatency = Math.max(0, Date.now() - data.sentAt);
          setLatencyMs(measuredLatency);
          latencySamplesRef.current = [...latencySamplesRef.current.slice(-19), measuredLatency];
          const average = latencySamplesRef.current.reduce((sum, value) => sum + value, 0) / latencySamplesRef.current.length;
          setAvgLatencyMs(Math.round(average));
        } else if (type === 'session-state') {
          const data = ws.receive.sessionState.parse(payload);
          setLastLocation({ lat: data.lat, lng: data.lng, zoom: data.zoom, tilt: data.tilt });
          setTrackerActive(data.trackerActive);
        } else if (type === 'tracker-disconnected') {
          setTrackerActive(false);
        } else if (type === 'tracker-connected') {
          setTrackerActive(true);
        }
      } catch (err) {
        console.error("Failed to parse or validate WS message", err);
      }
    };

    socket.onclose = () => {
      setStatus("disconnected");
      setTrackerActive(false);
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [sessionId, role]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (throttleTimeoutRef.current) clearTimeout(throttleTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect loop on unmount
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Method for tracker to send location updates
  const sendLocationUpdate = useCallback((lat: number, lng: number, zoom: number, tilt: number) => {
    if (role !== "tracker") return;

    pendingUpdateRef.current = { lat, lng, zoom, tilt };
    setLastLocation({ lat, lng, zoom, tilt });

    if (!throttleTimeoutRef.current) {
      flushUpdate();
    }
  }, [flushUpdate, role]);

  return {
    status,
    trackerActive,
    lastLocation,
    latencyMs,
    avgLatencyMs,
    sendLocationUpdate,
  };
}
