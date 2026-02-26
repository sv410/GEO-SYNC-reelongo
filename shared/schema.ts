import { pgTable, text, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // User-provided room ID
  name: text("name"),
  lat: doublePrecision("lat").notNull().default(51.505),
  lng: doublePrecision("lng").notNull().default(-0.09),
  zoom: doublePrecision("zoom").notNull().default(13),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({ createdAt: true, updatedAt: true });

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export const WS_EVENTS = {
  JOIN_SESSION: 'join-session',
  LEAVE_SESSION: 'leave-session',
  UPDATE_LOCATION: 'update-location',
  LOCATION_UPDATED: 'location-updated',
  SESSION_STATE: 'session-state',
  TRACKER_DISCONNECTED: 'tracker-disconnected',
  TRACKER_CONNECTED: 'tracker-connected',
} as const;

export interface LocationUpdatePayload {
  lat: number;
  lng: number;
  zoom: number;
}

export interface WsMessage<T = unknown> {
  type: keyof typeof WS_EVENTS;
  payload: T;
}
