import { pgTable, text, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── ENUMS ───────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["TENANT", "MANAGER", "TECHNICIAN"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "PENDING", "REJECTED"]);
export const ticketStatusEnum = pgEnum("ticket_status", [
  "OPEN", "ASSIGNED", "IN_PROGRESS", "BLOCKED", "DONE", "REOPENED", "CLOSED_DUPLICATE"
]);
export const priorityEnum = pgEnum("priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const categoryEnum = pgEnum("category", ["PLUMBING", "ELECTRICAL", "HVAC", "STRUCTURAL", "OTHER"]);
export const specialtyEnum = pgEnum("specialty", ["PLUMBING", "ELECTRICAL", "HVAC", "STRUCTURAL", "GENERAL"]);
export const imageTypeEnum = pgEnum("image_type", ["REPORT", "RESOLUTION"]);
export const actionTypeEnum = pgEnum("action_type", [
  "CREATED", "ASSIGNED", "UNASSIGNED", "MISMATCH_ASSIGNED", "STATUS_CHANGED", 
  "PRIORITY_CHANGED", "BLOCKED", "UNBLOCKED", "COMMENTED", "REOPENED", 
  "CLOSED_DUPLICATE", "IMAGE_ADDED", "ON_THE_WAY", "COMPLETION_SUBMITTED", 
  "COMPLETION_DISPUTED", "RATED"
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "TICKET_CREATED", "TICKET_ASSIGNED", "TICKET_UNASSIGNED", "STATUS_CHANGED",
  "PRIORITY_CHANGED", "BLOCKED", "UNBLOCKED", "ON_THE_WAY", "COMPLETION_SUBMITTED",
  "COMPLETION_DISPUTED", "CLOSED_DUPLICATE", "APPROVAL_REQUEST", "APPROVED", 
  "REJECTED", "ESCALATION", "RATING_REQUEST", "DAILY_DIGEST"
]);
export const registrationStatusEnum = pgEnum("registration_status", ["PENDING", "APPROVED", "REJECTED"]);

// ─── MODELS ──────────────────────────────────────────────────────────────────

export const usersTable = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  status: userStatusEnum("status").default("ACTIVE").notNull(),
  phone: text("phone"),
  unitNumber: text("unit_number"),
  buildingId: text("building_id"), // FK to buildings
  avatarUrl: text("avatar_url"),
  specialties: specialtyEnum("specialties").array(),
  telegramChatId: text("telegram_chat_id"),
  discordWebhook: text("discord_webhook"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const buildingsTable = pgTable("buildings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  address: text("address").notNull(),
  managerId: text("manager_id").notNull(), // FK to users
  emergencyPhone: text("emergency_phone"),
  businessHoursStart: integer("business_hours_start").default(8).notNull(),
  businessHoursEnd: integer("business_hours_end").default(18).notNull(),
  businessDays: integer("business_days").array().default([1, 2, 3, 4, 5]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ticketsTable = pgTable("tickets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: ticketStatusEnum("status").default("OPEN").notNull(),
  priority: priorityEnum("priority").default("MEDIUM").notNull(),
  category: categoryEnum("category").notNull(),
  tenantId: text("tenant_id").notNull(), // FK to users
  technicianId: text("technician_id"), // FK to users
  buildingId: text("building_id").notNull(), // FK to buildings
  unitNumber: text("unit_number").notNull(),
  resolutionNotes: text("resolution_notes"),
  completionVerified: boolean("completion_verified").default(false).notNull(),
  duplicateOfId: text("duplicate_of_id"), // FK to tickets
  blockReason: text("block_reason"),
  submittedAfterHours: boolean("submitted_after_hours").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const ticketImagesTable = pgTable("ticket_images", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ticketId: text("ticket_id").notNull(), // FK to tickets
  url: text("url").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  type: imageTypeEnum("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLogsTable = pgTable("activity_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ticketId: text("ticket_id").notNull(), // FK to tickets
  actorId: text("actor_id").notNull(), // FK to users
  action: actionTypeEnum("action").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(), // FK to users
  ticketId: text("ticket_id"), // FK to tickets
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const registrationRequestsTable = pgTable("registration_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique(), // FK to users
  reviewedBy: text("reviewed_by"), // FK to users
  status: registrationStatusEnum("status").default("PENDING").notNull(),
  rejectionReason: text("rejection_reason"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

export const ticketRatingsTable = pgTable("ticket_ratings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ticketId: text("ticket_id").notNull().unique(), // FK to tickets
  tenantId: text("tenant_id").notNull(), // FK to users
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const escalationRulesTable = pgTable("escalation_rules", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id").notNull(), // FK to buildings
  ruleName: text("rule_name").notNull(),
  triggerHours: integer("trigger_hours").notNull(),
  action: text("action").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── RELATIONS ───────────────────────────────────────────────────────────────

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  building: one(buildingsTable, {
    fields: [usersTable.buildingId],
    references: [buildingsTable.id],
  }),
  managedBuildings: many(buildingsTable),
  ticketsAsTenant: many(ticketsTable, { relationName: "tenant_tickets" }),
  ticketsAsTechnician: many(ticketsTable, { relationName: "technician_tickets" }),
  activityLogs: many(activityLogsTable),
  notifications: many(notificationsTable),
  registrationRequest: one(registrationRequestsTable, {
    fields: [usersTable.id],
    references: [registrationRequestsTable.userId],
  }),
  ratingsGiven: many(ticketRatingsTable),
}));

export const buildingsRelations = relations(buildingsTable, ({ one, many }) => ({
  manager: one(usersTable, {
    fields: [buildingsTable.managerId],
    references: [usersTable.id],
  }),
  residents: many(usersTable),
  tickets: many(ticketsTable),
  escalationRules: many(escalationRulesTable),
}));

export const ticketsRelations = relations(ticketsTable, ({ one, many }) => ({
  tenant: one(usersTable, {
    fields: [ticketsTable.tenantId],
    references: [usersTable.id],
    relationName: "tenant_tickets"
  }),
  technician: one(usersTable, {
    fields: [ticketsTable.technicianId],
    references: [usersTable.id],
    relationName: "technician_tickets"
  }),
  building: one(buildingsTable, {
    fields: [ticketsTable.buildingId],
    references: [buildingsTable.id],
  }),
  duplicateOf: one(ticketsTable, {
    fields: [ticketsTable.duplicateOfId],
    references: [ticketsTable.id],
    relationName: "duplicates"
  }),
  duplicates: many(ticketsTable, { relationName: "duplicates" }),
  images: many(ticketImagesTable),
  activityLogs: many(activityLogsTable),
  notifications: many(notificationsTable),
  rating: one(ticketRatingsTable, {
    fields: [ticketsTable.id],
    references: [ticketRatingsTable.ticketId],
  }),
}));

export const ticketImagesRelations = relations(ticketImagesTable, ({ one }) => ({
  ticket: one(ticketsTable, {
    fields: [ticketImagesTable.ticketId],
    references: [ticketsTable.id],
  }),
}));

export const activityLogsRelations = relations(activityLogsTable, ({ one }) => ({
  ticket: one(ticketsTable, {
    fields: [activityLogsTable.ticketId],
    references: [ticketsTable.id],
  }),
  actor: one(usersTable, {
    fields: [activityLogsTable.actorId],
    references: [usersTable.id],
  }),
}));

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [notificationsTable.userId],
    references: [usersTable.id],
  }),
  ticket: one(ticketsTable, {
    fields: [notificationsTable.ticketId],
    references: [ticketsTable.id],
  }),
}));

export const registrationRequestsRelations = relations(registrationRequestsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [registrationRequestsTable.userId],
    references: [usersTable.id],
  }),
}));

export const ticketRatingsRelations = relations(ticketRatingsTable, ({ one }) => ({
  ticket: one(ticketsTable, {
    fields: [ticketRatingsTable.ticketId],
    references: [ticketsTable.id],
  }),
  tenant: one(usersTable, {
    fields: [ticketRatingsTable.tenantId],
    references: [usersTable.id],
  }),
}));

export const escalationRulesRelations = relations(escalationRulesTable, ({ one }) => ({
  building: one(buildingsTable, {
    fields: [escalationRulesTable.buildingId],
    references: [buildingsTable.id],
  }),
}));
