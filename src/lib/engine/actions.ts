import type { Experience, Profile } from "../schema";
import { isSoftSkill, mentionsSkill, resolveSkill, skillDef, skillName } from "../taxonomy";
import { formatMonths, formatYears, norm } from "../text";
import type { GapAnalysis, GapItem, Severity } from "./gaps";
import { STRENGTH_LABEL, type ReadinessResult, type RequirementResult } from "./readiness";

/** Một gợi ý "Sửa được ngay" (UR-2.6.1). Mọi gợi ý chỉ dựa trên thứ hồ sơ đã có hoặc người dùng đã xác nhận. */
export interface FixSuggestion {
  id: string;
  kind: "rewrite" | "add-evidence" | "show-experience" | "total-line";
  title: string;
  /** Khoảng trống mà gợi ý này xử lý. */
  addresses: string;
  reqKey: string;
  severity: Severity;
  current: string | null;
  draft: string;
  note: string;
  basis: string;
  skillId: string | null;
  experienceId: string | null;
  bulletIndex: number | null;
  /** Văn bản gốc để guardrail so số liệu. */
  sources: string[];
}

/** Một việc "Cần xây dựng trước" (UR-2.6.2) — năng lực thật, không sửa được bằng câu chữ. */
export interface BuildItem {
  gap: GapItem;
  title: string;
  body: string;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const GENERIC = new Set(["cong", "ty", "tnhh", "phan", "jsc", "group", "tap", "doan", "viet", "nam", "sinh", "vien", "thuc", "truong", "trung", "tam"]);

/** Chỉ giữ từ đặc trưng (vd. "XYZ") để so tên công ty với câu trả lời tự do của người dùng. */
function distinctive(text: string): string {
  return [...tokens(text)].filter((t) => !GENERIC.has(t)).join(" ");
}

function tokens(text: string): Set<string> {
  return new Set(norm(text).split(/[^a-z0-9]+/).filter((t) => t.length > 2));
}

function overlap(a: string, b: string): number {
  const ta = tokens(a);
  let n = 0;
  for (const t of tokens(b)) if (ta.has(t)) n++;
  return n;
}

function pickExperience(profile: Profile, reqText: string): Experience | null {
  const list = profile.experience.filter((e) => e.onCv);
  if (!list.length) return null;
  return [...list].sort(
    (a, b) =>
      overlap([a.title, ...a.bullets].join(" "), reqText) - overlap([b.title, ...b.bullets].join(" "), reqText) ||
      (a.start ?? "").localeCompare(b.start ?? ""),
  )[list.length - 1];
}

function pickBullet(exp: Experience, reqText: string): number | null {
  if (!exp.bullets.length) return null;
  let bestIdx = 0;
  let bestScore = -1;
  exp.bullets.forEach((b, i) => {
    const s = overlap(b, reqText);
    if (s > bestScore) {
      bestScore = s;
      bestIdx = i;
    }
  });
  return bestIdx;
}

/** Bản viết lại dự phòng khi không có Gemini: giữ nguyên nội dung gốc, chỉ gắn tên kỹ năng và chừa chỗ cho số liệu. */
export function templateRewrite(bullet: string | null, skillId: string): string {
  const name = skillName(skillId);
  if (!bullet) return `Sử dụng ${name} để [việc cụ thể bạn đã làm], đạt [kết quả / số liệu].`;
  const base = bullet.trim().replace(/[.;,\s]+$/, "");
  const joiner = skillDef(skillId)?.category === "tool" ? ` bằng ${name}` : `, áp dụng ${name}`;
  return `${base}${joiner} — kết quả: [số liệu cụ thể, vd. tần suất báo cáo, số chiến dịch].`;
}

function shortReq(r: RequirementResult): string {
  return r.req.text.length > 70 ? `${r.req.text.slice(0, 68)}…` : r.req.text;
}

function suggestionsFor(profile: Profile, gap: GapItem): FixSuggestion[] {
  const r = gap.result;
  const base = { reqKey: r.key, severity: gap.severity, addresses: `${shortReq(r)} — ${STRENGTH_LABEL[r.strength].toLowerCase()}` };
  const out: FixSuggestion[] = [];

  // 1. Người dùng đã xác nhận khi làm rõ → đưa trải nghiệm đó vào CV.
  const clar = r.clarification?.answer === "done" ? r.clarification : null;
  if (clar && r.strength === "declared" && !r.evidence.some((e) => e.strength === "medium" || e.strength === "strong")) {
    const target = clar.where ? profile.experience.find((e) => e.onCv && overlap(distinctive(`${e.company} ${e.title}`), clar.where) > 0) : undefined;
    // Viết từ chính câu trả lời của người dùng; thiếu gì thì chừa chỗ để họ tự điền.
    const what = clar.where.trim() || `${capitalize(r.req.text.replace(/^(có |co )?(kinh nghiệm |kinh nghiem )?/i, ""))}: [bạn đã làm gì, ở đâu]`;
    const draft = `${capitalize(what).replace(/[.;]$/, "")}${clar.result ? ` — ${clar.result}` : " — kết quả: [số liệu cụ thể]"}${clar.period ? ` (${clar.period})` : ""}.`;
    out.push({
      ...base,
      id: `evidence:${r.key}`,
      kind: "add-evidence",
      title: target ? `Thêm một dòng vào mục ${target.title}` : "Thêm trải nghiệm này vào CV",
      current: null,
      draft,
      note: "Viết từ câu trả lời của bạn ở bước làm rõ. Hệ thống không tự thêm số liệu bạn chưa xác nhận.",
      basis: clar.where ? `Dựa trên câu trả lời: ${clar.where}.` : "Dựa trên câu trả lời của bạn ở bước làm rõ.",
      skillId: r.skillIds[0] ?? null,
      experienceId: target?.id ?? null,
      bulletIndex: null,
      sources: [clar.where, clar.result, clar.period, r.req.text],
    });
    return out;
  }

  // 2. Có trong mục người dùng tự khai nhưng chưa có trên CV.
  const hidden = r.evidence
    .filter((e) => e.strength === "declared" && e.experienceId)
    .map((e) => profile.experience.find((x) => x.id === e.experienceId))
    .filter((e): e is Experience => !!e && !e.onCv);
  for (const exp of [...new Map(hidden.map((e) => [e.id, e])).values()]) {
    out.push({
      ...base,
      id: `show:${exp.id}`,
      kind: "show-experience",
      title: `Đưa mục "${exp.title}" vào CV`,
      current: null,
      draft: [exp.title, exp.company].filter(Boolean).join(" — ") + (exp.bullets[0] ? `: ${exp.bullets[0]}` : ""),
      note: "Mục này đang được tính vào hồ sơ nhưng người đọc CV không thấy. Duyệt khi bạn đã thêm nó vào CV.",
      basis: "Dựa trên mục bạn tự khai ở bước hồ sơ năng lực.",
      skillId: null,
      experienceId: exp.id,
      bulletIndex: null,
      sources: [exp.title, exp.company, ...exp.bullets],
    });
  }
  if (out.length) return out;

  // 3. Chỉ có tên kỹ năng → viết lại một bullet có sẵn cho có bối cảnh. Kỹ năng mềm thì không:
  // gắn "áp dụng giao tiếp" vào một bullet không làm CV mạnh hơn, chỉ gây nhiễu (UR-2.4.3).
  if (r.strength === "weak" && r.skillIds.length && r.req.kind !== "soft" && !r.skillIds.every(isSoftSkill)) {
    // Kỹ năng người dùng đã ghi trong mục Kỹ năng — chỉ viết lại quanh kỹ năng đã có (UR-2.5.5).
    const skillId = r.skillIds.find((id) => profile.skills.some((s) => resolveSkill(s.name) === id || mentionsSkill(s.name, id))) ?? r.skillIds[0];
    const exp = pickExperience(profile, r.req.text);
    const idx = exp ? pickBullet(exp, r.req.text) : null;
    const current = exp && idx !== null ? exp.bullets[idx] : null;
    out.push({
      ...base,
      id: `rewrite:${r.key}:${exp?.id ?? "none"}:${idx ?? "new"}`,
      kind: "rewrite",
      title: exp ? `Viết lại bullet ở mục ${exp.title}` : `Thêm một dòng có dùng ${skillName(skillId)} vào CV`,
      current,
      draft: templateRewrite(current, skillId),
      note: "Chỗ trong [ ] cần bạn tự điền. Hệ thống không tự thêm số liệu bạn chưa xác nhận.",
      basis: exp
        ? `Dựa trên mục ${exp.title} đã có trong hồ sơ. Chỉ duyệt nếu bạn thật sự đã dùng ${skillName(skillId)} ở công việc này.`
        : "Hồ sơ chưa có mục kinh nghiệm nào để gắn vào.",
      skillId,
      experienceId: exp?.id ?? null,
      bulletIndex: idx,
      sources: [current ?? "", r.req.text],
    });
  }
  return out;
}

function totalLine(profile: Profile, gap: GapItem): FixSuggestion | null {
  const r = gap.result;
  if (!r.months || !r.shortfall || profile.experience.filter((e) => e.start).length < 2) return null;
  return {
    id: `total:${r.key}`,
    kind: "total-line",
    reqKey: r.key,
    severity: gap.severity,
    title: "Ghi rõ tổng thời gian kinh nghiệm",
    addresses: `${shortReq(r)} — chỉ làm rõ tổng thời gian, không bù được phần còn thiếu`,
    current: null,
    draft: `Tổng kinh nghiệm: ${formatMonths(r.months.have)} (${r.months.entries.join("; ")}).`,
    note: `Vẫn là ${formatMonths(r.months.have)} — không nói quá thành ${formatYears(r.months.need / 12)}.`,
    basis: `Bạn có ${formatMonths(r.months.have)} cộng dồn nhưng CV để rời từng mục, người đọc không cộng giúp bạn. Đưa mục liên quan nhất lên trên và ghi rõ tổng thời gian.`,
    skillId: null,
    experienceId: null,
    bulletIndex: null,
    sources: r.months.entries,
  };
}

export function buildActions(profile: Profile, readiness: ReadinessResult, gaps: GapAnalysis): { fixNow: FixSuggestion[]; buildFirst: BuildItem[] } {
  const fixNow: FixSuggestion[] = [];
  const seen = new Set<string>();
  const push = (s: FixSuggestion | null) => {
    if (s && !seen.has(s.id)) {
      seen.add(s.id);
      fixNow.push(s);
    }
  };
  for (const g of gaps.evidence) suggestionsFor(profile, g).forEach(push);
  for (const g of gaps.real) push(totalLine(profile, g));

  const onlyBlocker = readiness.blockers.length === 1 ? readiness.blockers[0].key : null;
  const buildFirst: BuildItem[] = gaps.real.map((g) => {
    const r = g.result;
    let body: string;
    if (g.severity === "low") body = "Không phải điều kiện loại. Đừng dừng việc nộp hồ sơ chỉ vì thiếu mục này.";
    else if (r.shortfall && r.months) {
      body = `Bạn có ${formatMonths(r.months.have)}, JD yêu cầu tối thiểu ${formatYears(r.months.need / 12)}. Còn thiếu ${formatMonths(
        r.months.need - r.months.have,
      )} — đây là thời gian phải tích luỹ thật, viết lại CV không rút ngắn được.`;
    } else if (r.shortfall) body = `${r.reason} Cần cải thiện thật trước khi đưa vào CV.`;
    else if (onlyBlocker === r.key) {
      body = "Đây là tiêu chí duy nhất đang chặn bạn ở JD này. Làm được một lần, có bằng chứng thật là hồ sơ tiến gần nhóm ưu tiên nộp.";
    } else if (g.type === "qualification") body = `${r.reason} Cần có bằng cấp / chứng chỉ thật, không thay bằng câu chữ.`;
    else body = "Gắn với yêu cầu bắt buộc. Không sửa được bằng câu chữ — cần làm thật (dự án, công việc) rồi mới đưa vào CV.";
    return { gap: g, title: r.req.text, body };
  });
  return { fixNow, buildFirst };
}
