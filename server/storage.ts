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
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db.insert(sessions).values(insertSession).returning();
    return session;
  }

  async updateSessionLocation(id: string, lat: number, lng: number, zoom: number): Promise<Session> {
    const [session] = await db.update(sessions)
      .set({ lat, lng, zoom, updatedAt: new Date() })
      .where(eq(sessions.id, id))
      .returning();
    return session;
  }
}

export const storage = new DatabaseStorage();
