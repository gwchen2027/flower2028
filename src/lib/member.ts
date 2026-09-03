import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export interface MemberInfo {
  user_id: string;
  email: string | null;
  role: string;
  credits: number;
  membership_expires_at: string | null;
  is_member: boolean;
  days_left: number;
}

/**
 * 从请求中解析登录用户。返回 null 表示未登录/认证失败。
 */
export async function getAuthUser(req: NextRequest): Promise<{ id: string; email: string | null } | null> {
  const token = req.headers.get("x-session");
  if (!token) return null;
  try {
    const client = getSupabaseClient(token);
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user) return null;
    return { id: user.id, email: user.email ?? null };
  } catch {
    return null;
  }
}

/**
 * 获取用户会员资料；若不存在则自动创建一条默认记录（非会员、0 额度）。
 */
export async function getOrCreateProfile(userId: string): Promise<MemberInfo | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("member_profiles")
    .select("user_id, role, credits, membership_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`查询会员资料失败: ${error.message}`);

  let profile = data as { role: string; credits: number; membership_expires_at: string | null } | null;

  if (!profile) {
    const { data: inserted, error: insErr } = await client
      .from("member_profiles")
      .insert({ user_id: userId, role: "user", credits: 0 })
      .select("role, credits, membership_expires_at")
      .maybeSingle();
    if (insErr) throw new Error(`创建会员资料失败: ${insErr.message}`);
    profile = inserted as { role: string; credits: number; membership_expires_at: string | null };
  }

  const now = Date.now();
  const expires = profile.membership_expires_at ? new Date(profile.membership_expires_at).getTime() : 0;
  const isMember = expires > now;
  const daysLeft = isMember ? Math.ceil((expires - now) / (1000 * 60 * 60 * 24)) : 0;

  return {
    user_id: userId,
    email: null,
    role: profile.role,
    credits: profile.credits,
    membership_expires_at: profile.membership_expires_at,
    is_member: isMember,
    days_left: daysLeft,
  };
}
