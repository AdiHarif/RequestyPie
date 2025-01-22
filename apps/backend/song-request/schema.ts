// schema.ts
import {
    pgTable,
    serial,
    text,
    pgEnum,
    json
} from "drizzle-orm/pg-core";

export const songRequestStatus = pgEnum("song_request_status", ["pending", "approved", "denied"]);

export const songRequestSchema = pgTable("song_requests", {
    id: serial().primaryKey().notNull(),
    trackId: text().notNull(),
    requester: text().notNull(),
    status: songRequestStatus().notNull().default("pending"),
    trackInfo: json().notNull(),
});
