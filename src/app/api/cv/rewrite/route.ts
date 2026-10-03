import { templateRewrite } from "@/lib/engine/actions";
import { geminiAvailable, rewriteWithGemini } from "@/lib/extract/gemini";
import { getCaller, jsonError, rateLimit } from "@/lib/server/guard";
import { resolveSkill, skillName } from "@/lib/taxonomy";

export const maxDuration = 30;

/**
 * UR-2.5.3 — Gợi ý viết lại một bullet. Kết quả luôn là bản nháp: giao diện chạy guardrail
 * (UR-2.5.6) và người dùng phải duyệt trước khi ghi vào hồ sơ.
 */
export async function POST(req: Request) {
  const caller = await getCaller(req);
  if (caller instanceof Response) return caller;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const bullet = typeof body?.bullet === "string" ? body.bullet.slice(0, 600) : "";
  const skill = typeof body?.skill === "string" ? body.skill.slice(0, 80) : "";
  const requirement = typeof body?.requirement === "string" ? body.requirement.slice(0, 300) : "";
  const role = typeof body?.role === "string" ? body.role.slice(0, 120) : "";
  if (!skill) return jsonError("Thiếu kỹ năng mục tiêu.", 400);

  const skillId = resolveSkill(skill);
  if (!geminiAvailable()) return Response.json({ draft: templateRewrite(bullet || null, skillId), by: "template" });
  const limited = rateLimit(caller.key, "rewrite", 40, 60 * 60 * 1000);
  if (limited) return limited;
  try {
    const draft = await rewriteWithGemini({ bullet, skill: skillName(skillId), requirement, role });
    return Response.json({ draft, by: "gemini" });
  } catch {
    return Response.json({ draft: templateRewrite(bullet || null, skillId), by: "template", warning: "Gemini lỗi — đã dùng mẫu viết lại có sẵn." });
  }
}
