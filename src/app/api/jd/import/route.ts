import { extractJobPosting, jobPostingToText, pageToText } from "@/lib/extract/jsonld";
import { fetchJobPage, ImportError } from "@/lib/extract/url-import";
import { extractVietnamWorks } from "@/lib/extract/vietnamworks";
import { analyzeJdText } from "@/lib/server/analyze";
import { getCaller, jsonError, rateLimit } from "@/lib/server/guard";

export const maxDuration = 60;

/**
 * Nhập JD từ URL (07-lua-chon-cong-nghe.md, trường hợp 1). Chỉ chạy khi người dùng chủ động
 * dán một link; giới hạn số link mỗi ngày; không lưu HTML gốc.
 */
export async function POST(req: Request) {
  const caller = await getCaller(req);
  if (caller instanceof Response) return caller;
  const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
  const url = typeof body?.url === "string" ? body.url : "";
  if (!url) return jsonError("Thiếu đường dẫn.", 400);
  const limited = rateLimit(caller.key, "import", 30, 24 * 60 * 60 * 1000);
  if (limited) return limited;

  let page: { html: string; finalUrl: string };
  try {
    page = await fetchJobPage(url);
  } catch (e) {
    const err = e instanceof ImportError ? e : new ImportError("Không lấy được trang.", "network");
    return jsonError(`${err.message} Bạn có thể dán nội dung JD thay thế.`, 422, { code: err.code });
  }
  const jp = extractJobPosting(page.html) ?? extractVietnamWorks(page.html, page.finalUrl);
  const text = jp ? jobPostingToText(jp) : pageToText(page.html);
  if (text.length < 80) return jsonError("Không đọc được nội dung tin tuyển dụng từ trang này. Hãy dán nội dung JD.", 422, { code: "empty" });
  const result = await analyzeJdText(text.slice(0, 30_000), { title: jp?.title, company: jp?.company });
  if (jp?.validThrough && !result.extraction.validThrough) result.extraction.validThrough = jp.validThrough.slice(0, 10);
  return Response.json({ ...result, rawText: text, url, structured: !!jp });
}
