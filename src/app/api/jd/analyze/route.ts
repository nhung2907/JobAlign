import { FileTextError, fileToText } from "@/lib/extract/file-text";
import { analyzeJdText } from "@/lib/server/analyze";
import { getCaller, jsonError, rateLimit } from "@/lib/server/guard";

export const maxDuration = 60;

const MAX_CHARS = 30_000;

/** UR-1.3 — Bóc tách JD dán tay hoặc tải tệp. */
export async function POST(req: Request) {
  const caller = await getCaller(req);
  if (caller instanceof Response) return caller;

  let text = "";
  let title = "";
  let company = "";
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return jsonError("Thiếu tệp JD.", 400);
    try {
      text = await fileToText(file);
    } catch (e) {
      return jsonError(e instanceof FileTextError ? e.message : "Không đọc được tệp.", 422);
    }
    title = String(form?.get("title") ?? "");
    company = String(form?.get("company") ?? "");
  } else {
    const body = (await req.json().catch(() => null)) as { text?: unknown; title?: unknown; company?: unknown } | null;
    text = typeof body?.text === "string" ? body.text : "";
    title = typeof body?.title === "string" ? body.title : "";
    company = typeof body?.company === "string" ? body.company : "";
  }
  text = text.trim();
  if (text.length < 80) return jsonError("Nội dung JD quá ngắn — hãy dán toàn bộ tin tuyển dụng.", 400);
  if (text.length > MAX_CHARS) return jsonError("Nội dung JD quá dài (tối đa 30.000 ký tự).", 400);

  const limited = rateLimit(caller.key, "jd", 60, 60 * 60 * 1000);
  if (limited) return limited;
  const result = await analyzeJdText(text, { title: title.slice(0, 120), company: company.slice(0, 120) });
  return Response.json({ ...result, rawText: text });
}
