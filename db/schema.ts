// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', {
 userId: text('user_id').notNull(), id: text('id').notNull(), data: text('data').notNull(), revision: integer('revision').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [primaryKey({ columns: [t.userId,t.id] })]);
export const versions = sqliteTable('versions', {
 userId: text('user_id').notNull(), id: text('id').notNull(), revision: integer('revision').notNull(), data: text('data').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [primaryKey({columns:[t.userId,t.id,t.revision]})]);
export const vocabulary = sqliteTable('vocabulary', { userId: text('user_id').primaryKey(), data: text('data').notNull(), revision: integer('revision').notNull() });

export const highlights = sqliteTable('highlights', { userId: text('user_id').notNull(), id: text('id').notNull(), data: text('data').notNull(), revision: integer('revision').notNull() }, t => [primaryKey({columns:[t.userId,t.id]})]);

export const vocabFavorites = sqliteTable('vocab_favorites', {userId:text('user_id').notNull(),id:text('id').notNull()},t=>[primaryKey({columns:[t.userId,t.id]})]);

export const vocabPlan=sqliteTable('vocab_plan',{userId:text('user_id').primaryKey(),start:text('start').notNull(),ids:text('ids').notNull()});
export const vocabViews=sqliteTable('vocab_views',{userId:text('user_id').notNull(),eventId:text('event_id').notNull(),cardId:text('card_id').notNull(),viewedAt:text('viewed_at').notNull()},t=>[primaryKey({columns:[t.userId,t.eventId]})]);

export const vocabImages=sqliteTable('vocab_images',{userId:text('user_id').notNull(),id:text('id').notNull(),url:text('url').notNull(),note:text('note').notNull(),status:text('status').notNull().default('pending'),createdAt:text('created_at').notNull()},t=>[primaryKey({columns:[t.userId,t.id]})]);
