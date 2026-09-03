import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/member";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED", message: "请先登录" }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const code = (body.code || "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "EMPTY_CODE", message: "请输入兑换码" }, { status: 400 });
  }

  try {
    const { getSupabaseClient } = await import("@/storage/database/supabase-client");
    const client = getSupabaseClient();

    // 原子兑换：调用数据库函数，避免并发竞态
    const { data, error } = await client.rpc("redeem_code", {
      p_code: code,
      p_user_id: user.id,
    });

    if (error) {
      // 自定义异常都会落到这里
      const msg = error.message || "";
      if (msg.includes("无效") || msg.includes("used") || msg.includes("INVALID")) {
        return NextResponse.json({ error: "INVALID_CODE", message: "兑换码无效或已被使用" }, { status: 400 });
      }
      throw new Error(msg);
    }

    return NextResponse.json({ success: true, result: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "兑换失败";
    return NextResponse.json({ error: "REDEEM_FAILED", message }, { status: 500 });
  }
}
