import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabaseConfigured } from "../supabase/config";
import { serverSupabase } from "../supabase/server";

export interface Caller {
  /** null ở chế độ demo (không có Supabase). */
  user: User | null;
  supabase: SupabaseClient | null;
  key: string;
}

export function jsonError(message: string, status: number, extra: Record<string, unknown> = {}) {
  return Response.json({ error: message, ...extra }, { status });
}

/** Khi có Supabase, mọi API xử lý dữ liệu đều yêu cầu đăng nhập (mục 6 — Authentication). */
export async function getCaller(req: Request): Promise<Caller | Response> {
  if (!supabaseConfigured) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
    return { user: null, supabase: null, key: `ip:${ip}` };
  }
  const supabase = await serverSupabase();
  const { data } = await supabase!.auth.getUser();
  if (!data.user) return jsonError("Bạn cần đăng nhập.", 401);
  return { user: data.user, supabase, key: `user:${data.user.id}` };
}

const buckets = new Map<string, number[]>();

/**
 * Giới hạn số lượt gọi tốn chi phí (LLM, tải trang ngoài) theo người dùng. Bộ nhớ trong một
 * instance — đủ cho prototype; lên production thì chuyển sang bảng Supabase.
 */
export function rateLimit(key: string, bucket: string, limit: number, windowMs: number): Response | null {
  const k = `${bucket}:${key}`;
  const now = Date.now();
  const hits = (buckets.get(k) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(k, hits);
    return jsonError("Bạn đã dùng hết lượt cho khoảng thời gian này, thử lại sau.", 429);
  }
  hits.push(now);
  buckets.set(k, hits);
  return null;
}
