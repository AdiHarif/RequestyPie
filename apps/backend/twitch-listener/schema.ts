
import {
    pgTable,
    text,
} from "drizzle-orm/pg-core";

export const eventSubSchema = pgTable("twitch_event_subs", {
    eventSubId: text().notNull(),
    requestyPieUserId: text().notNull()
});
