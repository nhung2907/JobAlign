import type { Job, RequirementKind, Seniority } from "./schema";
import { cityName } from "./taxonomy";

export function relativeDay(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days <= 0) return "hôm nay";
  if (days === 1) return "hôm qua";
  if (days < 30) return `${days} ngày trước`;
  return d.toLocaleDateString("vi-VN");
}

export const KIND_LABEL: Record<RequirementKind, string> = {
  skill: "Kỹ năng",
  experience: "Kinh nghiệm",
  qualification: "Trình độ",
  language: "Ngoại ngữ",
  certification: "Chứng chỉ",
  soft: "Kỹ năng mềm",
  other: "Khác",
};

export const SENIORITY_LABEL: Record<Seniority["level"], string> = {
  intern: "Thực tập",
  fresher: "Fresher — dưới 1 năm",
  junior: "Junior — 1 đến 2 năm",
  mid: "Middle — 3 đến 4 năm",
  senior: "Senior — từ 5 năm",
  unknown: "Chưa xác định",
};

function num(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

export function salaryText(job: Job): string | null {
  const s = job.conditions.salary;
  if (!s) return null;
  const unit = s.currency === "USD" ? "USD / tháng" : "triệu / tháng";
  if (s.min !== null && s.max !== null && s.min !== s.max) return `${num(s.min)} – ${num(s.max)} ${unit}`;
  if (s.min !== null && s.max === null) return `Từ ${num(s.min)} ${unit}`;
  if (s.min === null && s.max !== null) return `Tới ${num(s.max)} ${unit}`;
  return `${num((s.min ?? s.max)!)} ${unit}`;
}

export function locationText(job: Job): string | null {
  const l = job.conditions.location;
  if (!l || l.cities.length === 0) return null;
  return l.districts.length ? `${l.districts.join(", ")}, ${cityName(l.cities[0])}` : l.cities.map(cityName).join(", ");
}

export function workModeText(job: Job): string | null {
  const w = job.conditions.workMode;
  if (!w) return null;
  const name = { onsite: "Onsite", hybrid: "Hybrid", remote: "Remote" }[w.mode];
  if (w.mode === "hybrid" && w.onsiteDays) return `Hybrid — ${w.onsiteDays} ngày onsite`;
  if (w.mode === "onsite" && w.onsiteDays) return `Onsite ${w.onsiteDays} ngày/tuần`;
  return name;
}

export function jobLabel(job: Job): string {
  return job.company ? `${job.title} — ${job.company}` : job.title;
}
