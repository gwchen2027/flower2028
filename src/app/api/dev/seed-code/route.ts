import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 仅 DEV 环境开放：创建一个测试兑换码用于本地验证会员流程
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  if (process.env.COZE_PROJECT_ENV !== "DEV") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const client = getSupabaseClient();
  const code = "DEV" + Math.random().toString(36).slice(2, 8).toUpperCase();

  const { data, error } = await client
    .from("redeem_codes")
    .insert({
      code,
      plan: "monthly",
      duration_days: 30,
      credits_grant: 30,
      status: "unused",
      batch: "dev-seed",
    })
    .select("code")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ code: data.code });
}
