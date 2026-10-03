import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";

/** Đổi mã xác nhận email của Supabase Auth thành phiên đăng nhập. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/jobs";
  const supabase = await serverSupabase();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=callback", url.origin));
}
