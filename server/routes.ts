import type { Express } from "express";
import { type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api, ws as wsSchemas } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post(api.sessions.create.path, async (req, res) => {
    try {
      const input = api.sessions.create.input.parse(req.body);
      const existing = await storage.getSession(input.id);
      if (existing) {
        return res.status(200).json(existing);
      }
      const session = await storage.createSession(input);
      res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.sessions.get.path, async (req, res) => {
    const session = await storage.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    res.json(session);
  });

  // WebSocket Server Setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // In-memory tracking of clients per session
  const clients = new Map<string, Set<{ ws: WebSocket, role: 'tracker' | 'tracked' }>>();
  const sessionTilt = new Map<string, number>();

  wss.on('connection', (ws) => {
    let currentSessionId: string | null = null;
    let currentRole: 'tracker' | 'tracked' | null = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'join-session') {
          const payload = wsSchemas.send.joinSession.parse(data.payload);
          currentSessionId = payload.sessionId;
          currentRole = payload.role;

          if (!clients.has(currentSessionId)) {
            clients.set(currentSessionId, new Set());
          }
          clients.get(currentSessionId)!.add({ ws, role: currentRole });

          // Send current state
          const session = await storage.getSession(currentSessionId);
          if (session) {
            const hasTracker = Array.from(clients.get(currentSessionId) || []).some(c => c.role === 'tracker');
            ws.send(JSON.stringify({
              type: 'session-state',
              payload: {
                lat: session.lat,
                lng: session.lng,
                zoom: session.zoom,
                tilt: sessionTilt.get(currentSessionId) ?? 0,
                trackerActive: hasTracker,
              }
            }));
          }

          if (currentRole === 'tracker') {
            // Notify tracked users that tracker is connected
            clients.get(currentSessionId)?.forEach(client => {
              if (client.role === 'tracked' && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify({ type: 'tracker-connected', payload: {} }));
              }
            });
          }
        } else if (data.type === 'update-location' && currentRole === 'tracker') {
          const payload = wsSchemas.send.updateLocation.parse(data.payload);
          sessionTilt.set(payload.sessionId, payload.tilt);
          
          // Background DB update (don't block the WebSocket response)
          storage.updateSessionLocation(payload.sessionId, payload.lat, payload.lng, payload.zoom).catch(console.error);

          // Broadcast to all tracked users in the session immediately
          if (currentSessionId && clients.has(currentSessionId)) {
            clients.get(currentSessionId)?.forEach(client => {
              if (client.role === 'tracked' && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify({
                  type: 'location-updated',
                  payload: {
                    lat: payload.lat,
                    lng: payload.lng,
                    zoom: payload.zoom,
                    tilt: payload.tilt,
                    sentAt: payload.sentAt,
                    serverAt: Date.now(),
                  }
                }));
              }
            });
          }
        }
      } catch (err) {
        console.error("WS message error", err);
      }
    });

    ws.on('close', () => {
      if (currentSessionId && clients.has(currentSessionId)) {
        const sessionClients = clients.get(currentSessionId)!;
        sessionClients.forEach((client) => {
          if (client.ws === ws) {
            sessionClients.delete(client);
            if (currentRole === 'tracker') {
              // Notify tracked users that tracker disconnected
              sessionClients.forEach(c => {
                if (c.role === 'tracked' && c.ws.readyState === WebSocket.OPEN) {
                  c.ws.send(JSON.stringify({ type: 'tracker-disconnected', payload: {} }));
                }
              });
            }
          }
        });
        if (sessionClients.size === 0) {
          clients.delete(currentSessionId);
          sessionTilt.delete(currentSessionId);
        }
      }
    });
  });

  return httpServer;
}
