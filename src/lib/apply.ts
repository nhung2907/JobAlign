import type { FixSuggestion } from "./engine";
import type { Profile } from "./schema";
import { uid } from "./text";

/**
 * Ghi một gợi ý đã duyệt vào hồ sơ năng lực (UR-2.5). Không đụng tới tệp CV gốc — người dùng
 * tự cập nhật CV; hồ sơ là bản hệ thống dùng để chấm lại.
 */
export function applySuggestion(profile: Profile, s: FixSuggestion, text: string): Profile {
  const line = text.trim();
  switch (s.kind) {
    case "rewrite":
    case "add-evidence": {
      const exp = s.experienceId ? profile.experience.find((e) => e.id === s.experienceId) : undefined;
      if (exp) {
        const bullets = [...exp.bullets];
        if (s.kind === "rewrite" && s.bulletIndex !== null && s.bulletIndex < bullets.length) bullets[s.bulletIndex] = line;
        else bullets.push(line);
        return { ...profile, experience: profile.experience.map((e) => (e.id === exp.id ? { ...e, bullets, source: "user" } : e)) };
      }
      const name = s.kind === "add-evidence" ? s.basis.replace(/^Dựa trên câu trả lời:\s*/, "").replace(/\.$/, "") || "Trải nghiệm bổ sung" : "Trải nghiệm bổ sung";
      return { ...profile, projects: [...profile.projects, { id: uid("prj"), name, year: null, description: line, source: "user" }] };
    }
    case "show-experience":
      return { ...profile, experience: profile.experience.map((e) => (e.id === s.experienceId ? { ...e, onCv: true } : e)) };
    case "total-line":
      return profile;
  }
}
