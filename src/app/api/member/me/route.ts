import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getOrCreateProfile } from "@/lib/member";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED", message: "请先登录" }, { status: 401 });
  }
  try {
    const info = await getOrCreateProfile(user.id);
    if (!info) return NextResponse.json({ error: "PROFILE_ERROR" }, { status: 500 });

    // 最近写信记录数
    const client = getSupabaseClient();
    const { count } = await client
      .from("usage_records")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    return NextResponse.json({
      ...info,
      email: user.email,
      total_letters: count ?? 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: "SERVER_ERROR", message }, { status: 500 });
  }
}
