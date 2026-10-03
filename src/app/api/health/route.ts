import { GEMINI_MODEL, geminiAvailable } from "@/lib/extract/gemini";
import { supabaseConfigured } from "@/lib/supabase/config";

/** Cho giao diện biết đang chạy với dịch vụ nào (Gemini / bộ đọc dự phòng, Supabase / demo). */
export async function GET() {
  return Response.json({ gemini: geminiAvailable(), model: geminiAvailable() ? GEMINI_MODEL : null, supabase: supabaseConfigured });
}
