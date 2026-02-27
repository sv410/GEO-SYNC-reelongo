import { db } from "./db";
import { sessions, type Session, type InsertSession } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getSession(id: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSessionLocation(id: string, lat: number, lng: number, zoom: number): Promise<Session>;
}

export class DatabaseStorage implements IStorage {
  async getSession(id: string): Promise<Session | undefined> {
    if (!db) {
      throw new Error("Database is not configured");
    }
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    if (!db) {
      throw new Error("Database is not configured");
    }
    const [session] = await db.insert(sessions).values(insertSession).returning();
    return session;
  }

  async updateSessionLocation(id: string, lat: number, lng: number, zoom: number): Promise<Session> {
    if (!db) {
      throw new Error("Database is not configured");
    }
    const [session] = await db.update(sessions)
      .set({ lat, lng, zoom, updatedAt: new Date() })
      .where(eq(sessions.id, id))
      .returning();
    return session;
  }
}

export class InMemoryStorage implements IStorage {
  private sessions = new Map<string, Session>();

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const now = new Date();
    const session: Session = {
      id: insertSession.id,
      name: insertSession.name ?? null,
      lat: insertSession.lat ?? 51.505,
      lng: insertSession.lng ?? -0.09,
      zoom: insertSession.zoom ?? 13,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async updateSessionLocation(id: string, lat: number, lng: number, zoom: number): Promise<Session> {
    const existing = this.sessions.get(id);

    if (!existing) {
      const now = new Date();
      const created: Session = {
        id,
        name: null,
        lat,
        lng,
        zoom,
        createdAt: now,
        updatedAt: now,
      };
      this.sessions.set(id, created);
      return created;
    }

    const updated: Session = {
      ...existing,
      lat,
      lng,
      zoom,
      updatedAt: new Date(),
    };

    this.sessions.set(id, updated);
    return updated;
  }
}

export const storage = db ? new DatabaseStorage() : new InMemoryStorage();
