import { z } from 'zod';
import { insertSessionSchema, sessions } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  sessions: {
    create: {
      method: 'POST' as const,
      path: '/api/sessions' as const,
      input: z.object({
        id: z.string().min(1, "Session ID is required"),
        name: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof sessions.$inferSelect>(),
        201: z.custom<typeof sessions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/sessions/:id' as const,
      responses: {
        200: z.custom<typeof sessions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export const ws = {
  send: {
    joinSession: z.object({ sessionId: z.string(), role: z.enum(['tracker', 'tracked']) }),
    leaveSession: z.object({ sessionId: z.string() }),
    updateLocation: z.object({
      sessionId: z.string(),
      lat: z.number(),
      lng: z.number(),
      zoom: z.number(),
      tilt: z.number().min(0).max(60),
      sentAt: z.number(),
    }),
  },
  receive: {
    locationUpdated: z.object({
      lat: z.number(),
      lng: z.number(),
      zoom: z.number(),
      tilt: z.number(),
      sentAt: z.number(),
      serverAt: z.number(),
    }),
    sessionState: z.object({
      lat: z.number(),
      lng: z.number(),
      zoom: z.number(),
      tilt: z.number(),
      trackerActive: z.boolean(),
    }),
    trackerDisconnected: z.object({ message: z.string().optional() }),
    trackerConnected: z.object({ message: z.string().optional() }),
  },
};
