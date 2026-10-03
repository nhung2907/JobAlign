/**
 * Tham số chấm điểm — một nơi duy nhất (UR-1.6: "Ngưỡng phân loại cấu hình được, không
 * hard-code rải rác"). Ngưỡng cao/thấp của ma trận là quyết định mở R1 trong URD; giá trị
 * dưới đây là đề xuất khởi điểm, nhóm chỉnh ở đây hoặc qua biến môi trường.
 */
function envNumber(raw: string | undefined, fallback: number): number {
  const n = raw === undefined || raw === "" ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

// Tham chiếu process.env.NEXT_PUBLIC_* trực tiếp để Next.js nhúng được giá trị vào bundle trình duyệt.

export const SCORING = {
  /** Mức sẵn sàng ≥ ngưỡng và không còn blocker → "Readiness cao". */
  readinessThreshold: envNumber(process.env.NEXT_PUBLIC_READINESS_THRESHOLD, 70),
  /** Mức đáp ứng kỳ vọng ≥ ngưỡng và không vi phạm deal-breaker → "Work Fit cao". */
  workFitThreshold: envNumber(process.env.NEXT_PUBLIC_WORKFIT_THRESHOLD, 65),

  /** Trọng số yêu cầu JD. Kỹ năng mềm luôn tính như yêu cầu ưu tiên và không thành blocker. */
  requirementWeight: { must: 3, preferred: 1 },

  /** Điểm cho từng trạng thái đối chiếu. Unknown không vào mẫu số: không trừ điểm oan. */
  statusCredit: { met: 1, partial: 0.5, missing: 0 },

  /** Trọng số theo mức quan trọng người dùng gắn cho từng kỳ vọng (UR-1.2.5). */
  importanceWeight: { must: 3, important: 2, nice: 1 },

  /** Độ tin cậy = tỉ lệ tiêu chí có đủ dữ liệu để kết luận (UR-1.4.8). */
  confidence: { high: 0.8, medium: 0.5 },

  /** Tỉ giá quy đổi lương USD → triệu đồng khi so với kỳ vọng. */
  usdToMillionVnd: envNumber(process.env.NEXT_PUBLIC_USD_TO_MILLION_VND, 0.026),
} as const;
