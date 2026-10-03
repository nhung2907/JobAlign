import { norm } from "../text";
import type { ReadinessResult, RequirementResult } from "./readiness";

/** 6 loại khoảng trống (UR-2.3). Evidence Gap và các gap năng lực thật không bao giờ gộp chung. */
export type GapType = "evidence" | "skill" | "experience" | "responsibility" | "qualification" | "information";
export type Severity = "critical" | "high" | "medium" | "low";

export const GAP_LABEL: Record<GapType, string> = {
  evidence: "Evidence Gap",
  skill: "Skill Gap",
  experience: "Experience Gap",
  responsibility: "Responsibility Gap",
  qualification: "Qualification Gap",
  information: "Information Gap",
};

export const SEVERITY_LABEL: Record<Severity, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export interface GapItem {
  result: RequirementResult;
  type: GapType;
  severity: Severity;
  /** Vì sao xếp ở mức ưu tiên này (UR-2.4). */
  why: string;
  /** Tình trạng hiện tại, dựa trên bằng chứng. */
  detail: string;
}

export interface GapAnalysis {
  items: GapItem[];
  evidence: GapItem[];
  real: GapItem[];
  information: GapItem[];
}

export function classifyGap(r: RequirementResult): GapType | null {
  if (r.status === "met") return null;
  if (r.status === "unknown") return "information";
  if (r.status === "partial") {
    if (r.shortfall) return r.req.kind === "language" ? "qualification" : "experience";
    if (r.strength === "weak" || r.strength === "declared") return "evidence";
    if (r.group === "qualification") return "qualification";
    return r.clarification?.answer === "never" ? "skill" : "information";
  }
  switch (r.req.kind) {
    case "experience":
      return "experience";
    case "qualification":
    case "language":
    case "certification":
      return "qualification";
    case "other":
      return /(quan ly|phu trach|chiu trach nhiem|lead|dan dat|dieu phoi|manage)/.test(norm(r.req.text)) ? "responsibility" : "skill";
    default:
      return "skill";
  }
}

function severityOf(r: RequirementResult, type: GapType): Severity {
  if (!r.countsAsMust) return "low";
  switch (type) {
    case "skill":
    case "qualification":
    case "responsibility":
      return "critical";
    case "experience":
      return r.status === "missing" ? "critical" : "high";
    case "information":
      return "high";
    case "evidence":
      return "medium";
  }
}

function whyOf(r: RequirementResult, severity: Severity): string {
  if (severity === "low") {
    return r.req.level === "must"
      ? "Kỹ năng mềm — không tính là điều kiện loại, nên được hạ xuống cuối danh sách."
      : "Chỉ là tiêu chí ưu tiên, không phải điều kiện loại. Đã hạ xuống cuối danh sách để không gây nhiễu.";
  }
  if (severity === "critical") return "Gắn với một yêu cầu bắt buộc, nên ảnh hưởng trực tiếp tới việc hồ sơ có qua vòng đầu hay không.";
  if (severity === "high" && r.status === "unknown") return "Yêu cầu bắt buộc nhưng chưa đủ dữ liệu — nếu thật sự thiếu, đây có thể là điều kiện loại.";
  if (severity === "high") return "Yêu cầu bắt buộc mới đạt một phần.";
  return "Yêu cầu bắt buộc — năng lực đã có, chỉ cần thể hiện rõ hơn trên CV.";
}

function detailOf(r: RequirementResult, type: GapType): string {
  if (type === "evidence") {
    const clar = r.evidence.find((e) => e.where === "Bạn xác nhận khi làm rõ");
    if (clar) return `Bạn xác nhận đã làm (${clar.text}) — nhưng CV không nói ra điều đó.`;
    const declared = r.evidence.find((e) => e.strength === "declared");
    if (declared && r.months) return r.reason;
    if (declared) return `Có trong mục bạn tự khai (${declared.where.replace(/^Kinh nghiệm · /, "")}) — mục này chưa có trên CV.`;
    return "Chỉ xuất hiện dưới dạng tên trong mục Kỹ năng, không gắn với công việc hay kết quả nào.";
  }
  if (type === "information") return r.reason;
  if (type === "experience" && r.shortfall) return `${r.reason} Đây là khoảng trống thật chứ không phải chuyện câu chữ.`;
  if (r.clarification?.answer === "never") return "Bạn đã xác nhận chưa từng làm. Không sửa được bằng câu chữ — phải làm thật rồi mới đưa vào CV.";
  return r.reason;
}

export function analyzeGaps(readiness: ReadinessResult): GapAnalysis {
  const items: GapItem[] = [];
  for (const r of readiness.results) {
    const type = classifyGap(r);
    if (!type) continue;
    const severity = severityOf(r, type);
    items.push({ result: r, type, severity, why: whyOf(r, severity), detail: detailOf(r, type) });
  }
  items.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      Number(b.result.countsAsMust) - Number(a.result.countsAsMust) ||
      b.result.weight - a.result.weight,
  );
  return {
    items,
    evidence: items.filter((g) => g.type === "evidence"),
    real: items.filter((g) => g.type !== "evidence" && g.type !== "information"),
    information: items.filter((g) => g.type === "information"),
  };
}
