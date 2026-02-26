import { useState, useEffect, useRef, useCallback } from "react";
import { ws } from "@shared/routes";
import { z } from "zod";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

export function useMapWebSocket(sessionId: string, role: "tracker" | "tracked") {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [trackerActive, setTrackerActive] = useState<boolean>(false);
  const [lastLocation, setLastLocation] = useState<{lat: number, lng: number, zoom: number} | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

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
        } else if (type === 'session-state') {
          const data = ws.receive.sessionState.parse(payload);
          setLastLocation({ lat: data.lat, lng: data.lng, zoom: data.zoom });
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
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect loop on unmount
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Method for tracker to send location updates
  const sendLocationUpdate = useCallback((lat: number, lng: number, zoom: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && role === "tracker") {
      const payload = { sessionId, lat, lng, zoom };
      wsRef.current.send(JSON.stringify({ type: 'update-location', payload }));
      // Optimistically update local state too
      setLastLocation({ lat, lng, zoom });
    }
  }, [sessionId, role]);

  return {
    status,
    trackerActive,
    lastLocation,
    sendLocationUpdate,
  };
}
