import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const gradients = pgTable("gradients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  state: text("state").notNull(),
  tags: text("tags").notNull().default(""),
  previewCss: text("preview_css").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Gradient = typeof gradients.$inferSelect;
export type NewGradient = typeof gradients.$inferInsert;

export const palettes = pgTable("palettes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  baseColor: text("base_color").notNull(),
  shades: text("shades").notNull(), // JSON array of PaletteColor[]
  tags: text("tags").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PaletteRow = typeof palettes.$inferSelect;
export type NewPaletteRow = typeof palettes.$inferInsert;
