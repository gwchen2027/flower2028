import { pgTable, serial, timestamp, varchar, integer, numeric, jsonb, index, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 会员资料（与 auth.users 一一对应，记录会员有效期与剩余额度）
export const memberProfiles = pgTable(
	"member_profiles",
	{
		id: serial().primaryKey(),
		user_id: uuid("user_id").notNull().unique(),
		role: varchar("role", { length: 20 }).notNull().default("user"), // user | admin
		credits: integer("credits").notNull().default(0), // 剩余写信额度（1 元 = 1 封）
		membership_expires_at: timestamp("membership_expires_at", { withTimezone: true, mode: "string" }),
		created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
	},
	(table) => [index("member_profiles_user_id_idx").on(table.user_id)]
);

// 兑换码（管理员生成；30 元/月，激活即开通 30 天会员 + 30 次额度）
export const redeemCodes = pgTable(
	"redeem_codes",
	{
		id: serial().primaryKey(),
		code: varchar("code", { length: 32 }).notNull().unique(),
		plan: varchar("plan", { length: 20 }).notNull().default("monthly"), // monthly: 30元/30天/30额度
		duration_days: integer("duration_days").notNull().default(30),
		credits_grant: integer("credits_grant").notNull().default(30),
		status: varchar("status", { length: 20 }).notNull().default("unused"), // unused | used
		batch: varchar("batch", { length: 64 }),
		redeemed_by: uuid("redeemed_by"),
		redeemed_at: timestamp("redeemed_at", { withTimezone: true, mode: "string" }),
		created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
	},
	(table) => [
		index("redeem_codes_code_idx").on(table.code),
		index("redeem_codes_status_idx").on(table.status),
	]
);

// 充值/支付订单（真实支付网关回调后写入，开通会员）
export const paymentOrders = pgTable(
	"payment_orders",
	{
		id: serial().primaryKey(),
		order_no: varchar("order_no", { length: 64 }).notNull().unique(),
		user_id: uuid("user_id").notNull(),
		gateway: varchar("gateway", { length: 20 }).notNull(), // alipay | wechat
		plan: varchar("plan", { length: 20 }).notNull().default("monthly"),
		amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
		status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | paid | failed | closed
		paid_at: timestamp("paid_at", { withTimezone: true, mode: "string" }),
		gateway_payload: jsonb("gateway_payload"),
		created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
	},
	(table) => [
		index("payment_orders_user_id_idx").on(table.user_id),
		index("payment_orders_status_idx").on(table.status),
		index("payment_orders_order_no_idx").on(table.order_no),
	]
);

// 写信消耗记录（每生成 1 封扣 1 额度）
export const usageRecords = pgTable(
	"usage_records",
	{
		id: serial().primaryKey(),
		user_id: uuid("user_id").notNull(),
		recipient: varchar("recipient", { length: 128 }),
		sender: varchar("sender", { length: 128 }),
		credits_used: integer("credits_used").notNull().default(1),
		created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
	},
	(table) => [
		index("usage_records_user_id_idx").on(table.user_id),
		index("usage_records_created_at_idx").on(table.created_at),
	]
);
