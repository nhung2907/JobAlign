import type { Profile } from "../schema";
import { findSkillIds, resolveSkill, skillName } from "../taxonomy";

/**
 * Unsupported Claim Guardrail (UR-2.5.6): nội dung viết lại không được thêm kỹ năng, số liệu
 * hay thành tích mà hồ sơ chưa có. Kiểm tra bằng code, không tin vào lời hứa của LLM.
 */
export interface DraftCheck {
  /** Chỗ trống "[...]" người dùng còn phải tự điền. */
  placeholders: string[];
  /** Kỹ năng nhắc trong bản viết lại nhưng hồ sơ chưa có. */
  unsupportedSkills: string[];
  /** Con số không xuất hiện trong nội dung gốc hay câu trả lời của người dùng. */
  newNumbers: string[];
  /** Chặn duyệt khi còn chỗ trống hoặc có kỹ năng không có trong hồ sơ. */
  blocking: boolean;
}

export function profileSkillIds(profile: Profile): Set<string> {
  const ids = new Set<string>(profile.skills.map((s) => resolveSkill(s.name)));
  const texts = [
    ...profile.experience.flatMap((e) => [e.title, ...e.bullets]),
    ...profile.projects.map((p) => `${p.name}. ${p.description}`),
    ...profile.certifications.map((c) => c.name),
    ...profile.achievements.map((a) => a.text),
    ...profile.clarifications.filter((c) => c.answer === "done").map((c) => `${c.requirementText}. ${c.where}. ${c.result}`),
  ];
  for (const t of texts) for (const id of findSkillIds(t)) ids.add(id);
  return ids;
}

function numbers(text: string): string[] {
  return (text.match(/\d+(?:[.,]\d+)?\s*%?/g) ?? []).map((n) => n.replace(/\s+/g, "").replace(",", "."));
}

export function checkDraft(draft: string, profile: Profile, sourceTexts: string[], allowedSkillIds: string[] = []): DraftCheck {
  const placeholders = draft.match(/\[[^\]]+\]/g) ?? [];
  const known = profileSkillIds(profile);
  allowedSkillIds.forEach((id) => known.add(id));
  const unsupportedSkills = findSkillIds(draft)
    .filter((id) => !known.has(id))
    .map(skillName);
  const sourceNums = new Set(sourceTexts.flatMap(numbers));
  const newNumbers = [...new Set(numbers(draft.replace(/\[[^\]]+\]/g, "")))].filter((n) => !sourceNums.has(n));
  return { placeholders, unsupportedSkills, newNumbers, blocking: placeholders.length > 0 || unsupportedSkills.length > 0 };
}
