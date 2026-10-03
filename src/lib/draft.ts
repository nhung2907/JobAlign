"use client";
import { emptyProfile } from "./defaults";
import type { CvExtraction, Profile } from "./schema";

/** Kết quả đọc CV chờ người dùng xác nhận ở màn Hồ sơ năng lực — chưa lưu vào hồ sơ. */
export interface CvDraft {
  cv: CvExtraction;
  fileName: string;
  parser: "gemini" | "heuristic";
  path: string | null;
  warning: string | null;
}

const KEY = "jobalign:cvDraft";

export function saveCvDraft(d: CvDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* bộ nhớ phiên không dùng được — màn hồ sơ sẽ mở trống */
  }
}

export function readCvDraft(): CvDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CvDraft) : null;
  } catch {
    return null;
  }
}

export function clearCvDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* bỏ qua */
  }
}

/**
 * Ghép CV mới vào hồ sơ: phần đọc từ CV được thay mới, còn những gì người dùng đã tự khai
 * và các câu trả lời làm rõ được giữ lại để không phải nhập/hỏi lại.
 */
export function mergeDraft(existing: Profile | null, d: CvDraft): Profile {
  const base = existing ?? emptyProfile();
  const keepUser = <T extends { source: string }>(list: T[]) => list.filter((x) => x.source === "user");
  return {
    ...base,
    basics: {
      name: d.cv.basics.name || base.basics.name,
      email: d.cv.basics.email || base.basics.email,
      phone: d.cv.basics.phone || base.basics.phone,
    },
    education: [...d.cv.education, ...keepUser(base.education)],
    experience: [...d.cv.experience, ...keepUser(base.experience)],
    skills: [...d.cv.skills, ...keepUser(base.skills).filter((s) => !d.cv.skills.some((c) => c.name.toLowerCase() === s.name.toLowerCase()))],
    projects: [...d.cv.projects, ...keepUser(base.projects)],
    certifications: [...d.cv.certifications, ...keepUser(base.certifications)],
    achievements: [...d.cv.achievements, ...keepUser(base.achievements)],
    cv: { fileName: d.fileName, path: d.path, parsedAt: new Date().toISOString(), parser: d.parser },
  };
}
