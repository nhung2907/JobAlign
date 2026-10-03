import type { ReadinessResult } from "./readiness";
import type { WorkFitResult } from "./workfit";

export type Quadrant = "diamond" | "challenge" | "safe" | "low";

export const QUADRANTS: Record<
  Quadrant,
  { name: string; english: string; action: string; short: string; rank: number }
> = {
  diamond: { name: "Ô Kim Cương", english: "Priority apply", action: "Ưu tiên nộp", short: "Khớp cả hai chiều — nộp ngay", rank: 0 },
  challenge: { name: "Ô Thách Thức", english: "Stretch opportunity", action: "Thử sức", short: "Đãi ngộ tốt, còn thiếu năng lực — đáng đầu tư", rank: 1 },
  safe: { name: "Ô An toàn", english: "Backup / consider", action: "Cân nhắc", short: "Dễ pass nhưng chưa đạt kỳ vọng — để dự phòng", rank: 2 },
  low: { name: "Ô Chưa ưu tiên", english: "Low priority", action: "Chưa nên", short: "Chưa nên dành nhiều thời gian", rank: 3 },
};

export interface Decision {
  quadrant: Quadrant;
  headline: string;
  /** Các câu giải thích — luôn nêu lý do cụ thể, không chỉ một con số (UR-1.6.4). */
  explanation: string[];
  mustNotMet: number;
  mustPartial: number;
}

const HEADLINES: Record<Quadrant, string> = {
  diamond: "Nên nộp ngay — hồ sơ và công việc khớp cả hai chiều",
  challenge: "Đáng đầu tư, nhưng chưa nên nộp ngay hôm nay",
  safe: "Nộp được, nhưng công việc chưa đạt kỳ vọng của bạn",
  low: "Chưa nên dành nhiều thời gian cho JD này",
};

export function decide(readiness: ReadinessResult, workFit: WorkFitResult): Decision {
  const quadrant: Quadrant = readiness.high ? (workFit.high ? "diamond" : "safe") : workFit.high ? "challenge" : "low";
  const mustNotMet = readiness.blockers.length;
  const mustPartial = readiness.results.filter((r) => r.countsAsMust && r.status === "partial").length;
  const explanation: string[] = [];

  // Chiều 2 — công việc có hợp với bạn không.
  if (workFit.violated.length) {
    explanation.push(`Vi phạm deal-breaker của bạn: ${workFit.violated.map((d) => d.label.toLowerCase()).join("; ")}.`);
  } else if (workFit.score === null) {
    explanation.push("JD không nêu đủ điều kiện làm việc để so với kỳ vọng của bạn.");
  } else if (workFit.high) {
    explanation.push("Đãi ngộ và điều kiện làm việc khớp với kỳ vọng của bạn.");
  } else {
    const weak = workFit.criteria.filter((c) => c.status === "not_met" || c.status === "partial").map((c) => c.label.toLowerCase());
    explanation.push(
      weak.length
        ? `Chưa đạt kỳ vọng ở: ${weak.join(", ")} (mức đáp ứng ${workFit.score}/100, ngưỡng ${workFit.threshold}).`
        : `Mức đáp ứng kỳ vọng ${workFit.score}/100, dưới ngưỡng ${workFit.threshold}.`,
    );
  }

  // Chiều 1 — bạn có hợp với công việc không.
  if (readiness.high) {
    explanation.push(
      mustPartial
        ? `Hồ sơ đáp ứng các yêu cầu bắt buộc; ${mustPartial} yêu cầu mới đạt một phần, sửa thêm sẽ chắc hơn.`
        : "Hồ sơ đáp ứng các yêu cầu bắt buộc của JD.",
    );
  } else {
    const parts: string[] = [];
    if (mustNotMet) parts.push(`${mustNotMet} yêu cầu bắt buộc chưa đạt hoặc chưa có bằng chứng`);
    if (mustPartial) parts.push(`${mustPartial} yêu cầu bắt buộc mới đạt một phần`);
    if (parts.length) explanation.push(`Vướng ở chiều năng lực: còn ${parts.join(" và ")}.`);
    else if (readiness.score === null) explanation.push("Chưa đủ dữ liệu để đánh giá mức sẵn sàng — hãy làm rõ các tiêu chí còn thiếu.");
    else explanation.push(`Mức sẵn sàng ${readiness.score}/100, dưới ngưỡng ${readiness.threshold}.`);
  }

  if (quadrant === "challenge") explanation.push("Xử lý xong các điểm này thì hồ sơ vào nhóm ưu tiên nộp.");
  if (quadrant === "safe") explanation.push("Giữ làm phương án dự phòng, hoặc cân nhắc lại kỳ vọng nếu công việc hấp dẫn ở điểm khác.");
  if (quadrant === "low") explanation.push("Dành thời gian cho các JD khác trong danh sách trước.");

  return { quadrant, headline: HEADLINES[quadrant], explanation, mustNotMet, mustPartial };
}
