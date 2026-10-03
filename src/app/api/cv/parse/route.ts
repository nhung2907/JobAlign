import { FileTextError, fileToText } from "@/lib/extract/file-text";
import { analyzeCvText } from "@/lib/server/analyze";
import { getCaller, jsonError, rateLimit } from "@/lib/server/guard";
import { CV_BUCKET } from "@/lib/supabase/config";

export const maxDuration = 60;

/** UR-1.1.1 — Đọc CV một lần, trả về hồ sơ có cấu trúc để người dùng xem và sửa trước khi lưu. */
export async function POST(req: Request) {
  const caller = await getCaller(req);
  if (caller instanceof Response) return caller;
  const limited = rateLimit(caller.key, "cv", 20, 60 * 60 * 1000);
  if (limited) return limited;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("Thiếu tệp CV.", 400);

  let text: string;
  try {
    text = await fileToText(file);
  } catch (e) {
    return jsonError(e instanceof FileTextError ? e.message : "Không đọc được tệp.", 422);
  }
  const { cv, parser, warning } = await analyzeCvText(text);

  // Có Supabase: lưu tệp CV vào thư mục riêng của tài khoản (RLS theo user id).
  let path: string | null = null;
  if (caller.supabase && caller.user) {
    const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    path = `${caller.user.id}/${Date.now()}-${safe}`;
    const { error } = await caller.supabase.storage.from(CV_BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (error) path = null;
  }
  return Response.json({ cv, parser, warning, fileName: file.name, path });
}
