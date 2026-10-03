import type { DealBreaker, GrowthKey, Importance, Job, Preferences, WorkMode } from "../schema";
import { cityName } from "../taxonomy";
import { norm } from "../text";
import { SCORING } from "./config";

export type CriterionStatus = "met" | "partial" | "not_met" | "unknown";
export type CriterionKey = "salary" | "location" | "workMode" | "growth";

export interface CriterionResult {
  key: CriterionKey;
  label: string;
  importance: Importance;
  status: CriterionStatus;
  /** Điều kiện JD nêu, vd. "13 – 16 tr". */
  jdText: string;
  /** So với kỳ vọng, vd. "bạn cần ≥ 12". */
  compare: string;
  weight: number;
}

export interface DealBreakerResult {
  db: DealBreaker;
  label: string;
  status: "violated" | "ok" | "unknown";
  reason: string;
}

export interface WorkFitResult {
  score: number | null;
  high: boolean;
  threshold: number;
  criteria: CriterionResult[];
  unknown: CriterionResult[];
  dealBreakers: DealBreakerResult[];
  violated: DealBreakerResult[];
  byImportance: Record<Importance, { total: number; met: number; assessed: number }>;
}

export const MODE_LABEL: Record<WorkMode, string> = { onsite: "Onsite", hybrid: "Hybrid", remote: "Remote" };
export const GROWTH_LABEL: Record<GrowthKey, string> = {
  training: "Được đào tạo bài bản",
  promotion: "Có lộ trình thăng tiến rõ",
  mentor: "Có mentor trực tiếp",
  learningBudget: "Ngân sách học tập",
};
export const IMPORTANCE_LABEL: Record<Importance, string> = { must: "Must-have", important: "Important", nice: "Nice-to-have" };
export const CRITERION_LABEL: Record<CriterionKey, string> = {
  salary: "Lương",
  location: "Địa điểm",
  workMode: "Hình thức",
  growth: "Đào tạo & thăng tiến",
};

export function dealBreakerLabel(db: DealBreaker): string {
  switch (db.kind) {
    case "salary_below":
      return `Lương dưới ${db.value ?? "?"} triệu`;
    case "onsite_full":
      return "Bắt buộc onsite 5 ngày/tuần";
    case "outside_city":
      return "Làm việc ngoài khu vực đã chọn";
    case "keyword":
      return `JD có "${db.keyword ?? ""}"`;
  }
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

/** Khoảng lương JD quy về triệu đồng / tháng. */
export function salaryRange(job: Job): { lo: number; hi: number; text: string } | null {
  const s = job.conditions.salary;
  if (!s || (s.min === null && s.max === null)) return null;
  const rate = s.currency === "USD" ? SCORING.usdToMillionVnd : 1;
  const lo = (s.min ?? s.max)! * rate;
  const hi = (s.max ?? s.min)! * rate;
  const text = s.min !== null && s.max !== null && s.min !== s.max ? `${fmt(lo)} – ${fmt(hi)} tr` : s.min !== null && s.max === null ? `từ ${fmt(lo)} tr` : `tới ${fmt(hi)} tr`;
  return { lo, hi, text: s.currency === "USD" ? `${text} (quy đổi từ USD)` : text };
}

function salaryCriterion(prefs: Preferences, job: Job): CriterionResult | null {
  const { desired, minimum, importance } = prefs.salary;
  if (desired === null && minimum === null) return null;
  const base = { key: "salary" as const, label: CRITERION_LABEL.salary, importance, weight: SCORING.importanceWeight[importance] };
  const need = minimum !== null ? `bạn cần ≥ ${fmt(minimum)}` : `bạn mong muốn ${fmt(desired!)}`;
  const r = salaryRange(job);
  if (!r) return { ...base, status: "unknown", jdText: "JD không nêu", compare: need };
  let status: CriterionStatus;
  if (minimum !== null && r.hi < minimum) status = "not_met";
  else if (desired === null) status = "met";
  else if (r.hi >= desired) status = "met";
  else status = "partial";
  return { ...base, status, jdText: r.text, compare: need };
}

function locationCriterion(prefs: Preferences, job: Job): CriterionResult | null {
  const { cities, districts, importance } = prefs.location;
  if (cities.length === 0) return null;
  const base = { key: "location" as const, label: CRITERION_LABEL.location, importance, weight: SCORING.importanceWeight[importance] };
  if (job.conditions.workMode?.mode === "remote") return { ...base, status: "met", jdText: "Làm từ xa", compare: "không cần đi lại" };
  const loc = job.conditions.location;
  if (!loc || loc.cities.length === 0) return { ...base, status: "unknown", jdText: "JD không nêu", compare: "" };
  const place = loc.districts.length ? `${loc.districts.join(", ")}, ${cityName(loc.cities[0])}` : loc.cities.map(cityName).join(", ");
  if (!loc.cities.some((c) => cities.includes(c))) return { ...base, status: "not_met", jdText: place, compare: "ngoài khu vực bạn chọn" };
  if (districts.length === 0) return { ...base, status: "met", jdText: place, compare: "đúng thành phố" };
  if (loc.districts.length === 0) return { ...base, status: "met", jdText: place, compare: "JD chỉ nêu thành phố — kiểm tra quãng đường" };
  if (loc.districts.some((d) => districts.includes(d))) return { ...base, status: "met", jdText: place, compare: "đúng khu vực" };
  return { ...base, status: "partial", jdText: place, compare: "khác quận bạn chọn — kiểm tra thời gian đi lại" };
}

function workModeCriterion(prefs: Preferences, job: Job): CriterionResult | null {
  const { modes, importance } = prefs.workMode;
  if (modes.length === 0) return null;
  const base = { key: "workMode" as const, label: CRITERION_LABEL.workMode, importance, weight: SCORING.importanceWeight[importance] };
  const wm = job.conditions.workMode;
  if (!wm) return { ...base, status: "unknown", jdText: "JD không nêu", compare: "" };
  const jdText = wm.mode === "hybrid" && wm.onsiteDays ? `Hybrid — ${wm.onsiteDays} ngày onsite` : wm.mode === "onsite" && wm.onsiteDays ? `Onsite ${wm.onsiteDays} ngày/tuần` : MODE_LABEL[wm.mode];
  if (modes.includes(wm.mode)) return { ...base, status: "met", jdText, compare: "đúng hình thức bạn muốn" };
  const partial =
    (modes.includes("hybrid") && wm.mode === "remote") ||
    (modes.includes("remote") && wm.mode === "hybrid") ||
    (modes.includes("onsite") && wm.mode === "hybrid");
  return {
    ...base,
    status: partial ? "partial" : "not_met",
    jdText,
    compare: `bạn muốn ${modes.map((m) => MODE_LABEL[m]).join(" / ")}`,
  };
}

function growthCriterion(prefs: Preferences, job: Job): CriterionResult | null {
  const { wants, importance } = prefs.growth;
  if (wants.length === 0) return null;
  const base = { key: "growth" as const, label: CRITERION_LABEL.growth, importance, weight: SCORING.importanceWeight[importance] };
  const g = job.conditions.growth;
  const has = g ? wants.filter((w) => g[w]) : [];
  // JD không nhắc tới ≠ JD nói không có (NT-3) → không bao giờ kết luận "không đạt".
  if (has.length === 0) return { ...base, status: "unknown", jdText: "JD không nêu", compare: "" };
  const missing = wants.filter((w) => !has.includes(w));
  return {
    ...base,
    status: missing.length === 0 ? "met" : "partial",
    jdText: has.map((w) => GROWTH_LABEL[w]).join(", "),
    compare: missing.length ? `chưa nêu: ${missing.map((w) => GROWTH_LABEL[w].toLowerCase()).join(", ")}` : "đúng điều bạn cần",
  };
}

export function checkDealBreaker(db: DealBreaker, prefs: Preferences, job: Job): DealBreakerResult {
  const label = dealBreakerLabel(db);
  switch (db.kind) {
    case "salary_below": {
      const r = salaryRange(job);
      if (db.value === null) return { db, label, status: "ok", reason: "" };
      if (!r) return { db, label, status: "unknown", reason: "JD không nêu lương — chưa kiểm tra được." };
      return r.hi < db.value
        ? { db, label, status: "violated", reason: `Lương tối đa ${r.text}, dưới ${db.value} triệu.` }
        : { db, label, status: "ok", reason: "" };
    }
    case "onsite_full": {
      const wm = job.conditions.workMode;
      if (!wm) return { db, label, status: "unknown", reason: "JD không nêu hình thức làm việc." };
      const full = (wm.mode === "onsite" && (wm.onsiteDays === null || wm.onsiteDays >= 5)) || (wm.mode === "hybrid" && (wm.onsiteDays ?? 0) >= 5);
      return full ? { db, label, status: "violated", reason: "JD yêu cầu làm tại văn phòng cả tuần." } : { db, label, status: "ok", reason: "" };
    }
    case "outside_city": {
      if (prefs.location.cities.length === 0 || job.conditions.workMode?.mode === "remote") return { db, label, status: "ok", reason: "" };
      const loc = job.conditions.location;
      if (!loc || loc.cities.length === 0) return { db, label, status: "unknown", reason: "JD không nêu địa điểm." };
      return loc.cities.some((c) => prefs.location.cities.includes(c))
        ? { db, label, status: "ok", reason: "" }
        : { db, label, status: "violated", reason: `Làm việc tại ${loc.cities.map(cityName).join(", ")}.` };
    }
    case "keyword": {
      const k = norm(db.keyword ?? "");
      if (!k) return { db, label, status: "ok", reason: "" };
      return norm(job.rawText).includes(k)
        ? { db, label, status: "violated", reason: `JD có nhắc tới "${db.keyword}" — kiểm tra lại ngữ cảnh trong JD gốc.` }
        : { db, label, status: "ok", reason: "" };
    }
  }
}

export function evaluateWorkFit(prefs: Preferences, job: Job): WorkFitResult {
  const criteria = [salaryCriterion(prefs, job), locationCriterion(prefs, job), workModeCriterion(prefs, job), growthCriterion(prefs, job)].filter(
    (c): c is CriterionResult => c !== null,
  );
  const assessed = criteria.filter((c) => c.status !== "unknown");
  const credit = { met: 1, partial: 0.5, not_met: 0 } as const;
  const max = assessed.reduce((s, c) => s + c.weight, 0);
  const pts = assessed.reduce((s, c) => s + c.weight * credit[c.status as keyof typeof credit], 0);
  const score = max > 0 ? Math.round((100 * pts) / max) : null;
  const dealBreakers = prefs.dealBreakers.map((db) => checkDealBreaker(db, prefs, job));
  const violated = dealBreakers.filter((d) => d.status === "violated");
  const byImportance = (["must", "important", "nice"] as Importance[]).reduce(
    (acc, imp) => {
      const list = criteria.filter((c) => c.importance === imp);
      acc[imp] = { total: list.length, met: list.filter((c) => c.status === "met").length, assessed: list.filter((c) => c.status !== "unknown").length };
      return acc;
    },
    {} as WorkFitResult["byImportance"],
  );
  return {
    score,
    threshold: SCORING.workFitThreshold,
    high: score !== null && score >= SCORING.workFitThreshold && violated.length === 0,
    criteria,
    unknown: criteria.filter((c) => c.status === "unknown"),
    dealBreakers,
    violated,
    byImportance,
  };
}
