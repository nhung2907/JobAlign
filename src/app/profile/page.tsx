"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type ReactNode } from "react";
import { Page } from "@/components/app-shell";
import { IconFile, IconPencil, IconPlus, IconX } from "@/components/icons";
import { Avatar, Button, Card, CompanyLogo, cx, Eyebrow, Loading, Notice, SourceTag, Spinner, Tag, UR } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import { emptyProfile } from "@/lib/defaults";
import { clearCvDraft, mergeDraft, readCvDraft } from "@/lib/draft";
import type { Certification, Education, Experience, Profile, Project } from "@/lib/schema";
import { formatMonths, formatYm, monthsBetween, uid } from "@/lib/text";

/* ---------------------------------------------------------------- khối dùng chung */

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="px-5 pt-4 pb-5 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

/** Nút tròn chỉ có biểu tượng (bút chì để sửa, dấu cộng để thêm) như các mục hồ sơ trên LinkedIn. */
function LinkBtn({ onClick, children }: { onClick(): void; children: string }) {
  const Icon = children === "Sửa" ? IconPencil : IconPlus;
  return (
    <button type="button" onClick={onClick} aria-label={children} title={children} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-muted hover:text-ink">
      <Icon size={20} />
    </button>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function FormActions({ onCancel, onSave, onDelete }: { onCancel(): void; onSave(): void; onDelete?(): void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
      {onDelete ? (
        <button type="button" onClick={onDelete} className="text-[13px] text-danger-strong hover:underline">
          Xoá mục này
        </button>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <Button variant="muted" size="sm" onClick={onCancel}>
          Huỷ
        </Button>
        <Button size="sm" variant="primary" onClick={onSave}>
          Xong
        </Button>
      </div>
    </div>
  );
}

function EndInput({ value, onChange }: { value: string | null; onChange(v: string | null): void }) {
  const present = value === "present";
  return (
    <div className="flex flex-col gap-2">
      <input type="month" className="field" disabled={present} value={present ? "" : (value ?? "")} onChange={(e) => onChange(e.target.value || null)} />
      <label className="flex items-center gap-2 text-[13px] text-ink-3">
        <input type="checkbox" className="accent-accent" checked={present} onChange={(e) => onChange(e.target.checked ? "present" : null)} /> Đến hiện tại
      </label>
    </div>
  );
}

function period(start: string | null, end: string | null) {
  if (!start && !end) return "Chưa rõ thời gian";
  const m = monthsBetween(start, end);
  return `${formatYm(start)} – ${formatYm(end)}${m ? ` · ${formatMonths(m)}` : ""}`;
}

/* ---------------------------------------------------------------- form từng loại mục */

function ExperienceForm({ value, onSave, onCancel, onDelete }: { value: Experience; onSave(e: Experience): void; onCancel(): void; onDelete?(): void }) {
  const [v, setV] = useState(value);
  const [bullets, setBullets] = useState(value.bullets.join("\n"));
  return (
    <div id={`item-${value.id}`} className="scroll-mt-24 rounded-md border border-line-soft bg-subtle p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Vị trí">
          <input className="field" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        </Field>
        <Field label="Công ty / tổ chức">
          <input className="field" value={v.company} onChange={(e) => setV({ ...v, company: e.target.value })} />
        </Field>
        <Field label="Bắt đầu">
          <input type="month" className="field" value={v.start ?? ""} onChange={(e) => setV({ ...v, start: e.target.value || null })} />
        </Field>
        <Field label="Kết thúc">
          <EndInput value={v.end} onChange={(end) => setV({ ...v, end: end as Experience["end"] })} />
        </Field>
      </div>
      <Field label="Mô tả công việc — mỗi dòng một ý" className="mt-3">
        <textarea className="field-area min-h-28" value={bullets} onChange={(e) => setBullets(e.target.value)} />
      </Field>
      <label className="mt-3 flex items-center gap-2 text-[13px] text-ink-2">
        <input type="checkbox" className="accent-accent" checked={v.onCv} onChange={(e) => setV({ ...v, onCv: e.target.checked })} />
        Mục này đã có trên CV
      </label>
      <FormActions
        onCancel={onCancel}
        onDelete={onDelete}
        onSave={() =>
          onSave({
            ...v,
            title: v.title.trim() || "Vị trí chưa đặt tên",
            bullets: bullets
              .split("\n")
              .map((b) => b.trim())
              .filter(Boolean),
          })
        }
      />
    </div>
  );
}

function EducationForm({ value, onSave, onCancel, onDelete }: { value: Education; onSave(e: Education): void; onCancel(): void; onDelete?(): void }) {
  const [v, setV] = useState(value);
  return (
    <div className="rounded-md border border-line-soft bg-subtle p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Bằng cấp (vd. Cử nhân)">
          <input className="field" value={v.degree} onChange={(e) => setV({ ...v, degree: e.target.value })} />
        </Field>
        <Field label="Trường">
          <input className="field" value={v.school} onChange={(e) => setV({ ...v, school: e.target.value })} />
        </Field>
        <Field label="Chuyên ngành">
          <input className="field" value={v.major} onChange={(e) => setV({ ...v, major: e.target.value })} />
        </Field>
        <Field label="GPA">
          <input className="field" value={v.gpa ?? ""} onChange={(e) => setV({ ...v, gpa: e.target.value || null })} />
        </Field>
        <Field label="Bắt đầu">
          <input type="month" className="field" value={v.start ?? ""} onChange={(e) => setV({ ...v, start: e.target.value || null })} />
        </Field>
        <Field label="Tốt nghiệp">
          <EndInput value={v.end} onChange={(end) => setV({ ...v, end: end as Education["end"] })} />
        </Field>
      </div>
      <FormActions onCancel={onCancel} onDelete={onDelete} onSave={() => onSave(v)} />
    </div>
  );
}

function ProjectForm({ value, onSave, onCancel, onDelete }: { value: Project; onSave(p: Project): void; onCancel(): void; onDelete?(): void }) {
  const [v, setV] = useState(value);
  return (
    <div className="rounded-md border border-line-soft bg-subtle p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <Field label="Tên dự án / hoạt động">
          <input className="field" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="Năm">
          <input className="field" inputMode="numeric" value={v.year ?? ""} onChange={(e) => setV({ ...v, year: e.target.value || null })} />
        </Field>
      </div>
      <Field label="Bạn làm gì, dùng công cụ gì, kết quả ra sao" className="mt-3">
        <textarea className="field-area min-h-24" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </Field>
      <FormActions onCancel={onCancel} onDelete={onDelete} onSave={() => onSave({ ...v, name: v.name.trim() || "Dự án chưa đặt tên" })} />
    </div>
  );
}

function CertForm({ value, onSave, onCancel, onDelete }: { value: Certification; onSave(c: Certification): void; onCancel(): void; onDelete?(): void }) {
  const [v, setV] = useState(value);
  return (
    <div className="rounded-md border border-line-soft bg-subtle p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Field label="Tên chứng chỉ (vd. IELTS, Google Analytics Certification)">
          <input className="field" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="Điểm / cấp độ">
          <input className="field" value={v.score ?? ""} onChange={(e) => setV({ ...v, score: e.target.value || null })} />
        </Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-[13px] text-ink-2">
        <input type="checkbox" className="accent-accent" checked={v.kind === "language"} onChange={(e) => setV({ ...v, kind: e.target.checked ? "language" : "cert" })} />
        Chứng chỉ ngoại ngữ
      </label>
      <FormActions onCancel={onCancel} onDelete={onDelete} onSave={() => onSave(v)} />
    </div>
  );
}

/* ---------------------------------------------------------------- trang */

type Editing = { kind: "basics" } | { kind: "edu" | "exp" | "prj" | "cert"; id: string; isNew?: boolean } | null;

function ProfileGate() {
  const ws = useWorkspace();
  const params = useSearchParams();
  if (!ws.ready) return <Loading />;
  // Chỉ dựng trình sửa khi dữ liệu đã nạp, để khởi tạo state một lần từ bản nháp CV hoặc hồ sơ đã lưu.
  return <ProfileEditor fromDraft={!!params.get("draft")} />;
}

function initialState(saved: Profile | null, fromDraft: boolean) {
  const draft = fromDraft ? readCvDraft() : null;
  if (draft) return { profile: mergeDraft(saved, draft), warning: draft.warning, dirty: true };
  return { profile: saved ?? emptyProfile(), warning: null, dirty: !saved };
}

function ProfileEditor({ fromDraft }: { fromDraft: boolean }) {
  const ws = useWorkspace();
  const router = useRouter();
  const [init] = useState(() => initialState(ws.profile, fromDraft));
  const [p, setP] = useState<Profile>(init.profile);
  const [dirty, setDirty] = useState(init.dirty);
  const [editing, setEditing] = useState<Editing>(null);
  const [newSkill, setNewSkill] = useState("");
  const [newAch, setNewAch] = useState("");
  const warning = init.warning;
  const [saving, setSaving] = useState(false);
  const onboarding = !ws.preferences;

  const update = (fn: (x: Profile) => Profile) => {
    setP(fn);
    setDirty(true);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await ws.saveProfile(p);
      clearCvDraft();
      setDirty(false);
      if (onboarding) router.push("/preferences");
      else ws.toast(ws.jobs.length ? "Đã lưu hồ sơ — các JD đã được chấm lại." : "Đã lưu hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  const clarified = useMemo(() => p.clarifications.filter((c) => c.answer !== "skip"), [p]);

  const edit = <K extends "education" | "experience" | "projects" | "certifications">(key: K, item: Profile[K][number]) =>
    update((x) => {
      const list = x[key] as { id: string }[];
      const exists = list.some((i) => i.id === item.id);
      return { ...x, [key]: exists ? list.map((i) => (i.id === item.id ? item : i)) : [...list, item] };
    });
  const remove = (key: "education" | "experience" | "projects" | "certifications", id: string) =>
    update((x) => ({ ...x, [key]: (x[key] as { id: string }[]).filter((i) => i.id !== id) }));
  // Người dùng sửa một mục đọc từ CV → mục đó thành "Bạn bổ sung" (UR-1.1.4).
  const asUser = <T extends { source: string }>(item: T): T => ({ ...item, source: "user" });

  const newExp = (onCv: boolean): Experience => ({ id: uid("exp"), title: "", company: "", start: null, end: null, bullets: [], onCv, source: "user" });
  const draftExp = editing?.kind === "exp" && editing.isNew ? (p.experience.find((e) => e.id === editing.id) ?? null) : null;
  const latest = p.experience.find((e) => e.onCv) ?? p.experience[0];
  const headline = latest ? [latest.title, latest.company].filter(Boolean).join(" tại ") : p.education[0] ? [p.education[0].degree, p.education[0].major].filter(Boolean).join(" ") : "Chưa có kinh nghiệm trong hồ sơ";

  return (
    <Page className="md:grid md:grid-cols-[1fr_300px] md:items-start md:gap-7">
      <div className="flex flex-col gap-4">
        <Card className="overflow-hidden">
          <div className="relative h-24 bg-gradient-to-r from-[#0a66c2] via-[#4a90d9] to-[#a8d0f5] sm:h-32" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_30%,rgba(255,255,255,0.35),transparent_45%)]" />
          </div>
          <div className="px-5 pb-5 sm:px-6">
            <div className="relative -mt-12 flex items-end justify-between sm:-mt-16">
              <span className="flex rounded-full border-4 border-surface bg-surface">
                <span className="hidden sm:flex">
                  <Avatar name={p.basics.name} size={120} />
                </span>
                <span className="flex sm:hidden">
                  <Avatar name={p.basics.name} size={88} />
                </span>
              </span>
              {editing?.kind !== "basics" && <LinkBtn onClick={() => setEditing({ kind: "basics" })}>Sửa</LinkBtn>}
            </div>
            {editing?.kind === "basics" ? (
              <div className="mt-3">
                <BasicsForm value={p.basics} onCancel={() => setEditing(null)} onSave={(b) => (update((x) => ({ ...x, basics: b })), setEditing(null))} />
              </div>
            ) : (
              <div className="mt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold">{p.basics.name || "Chưa có họ tên"}</h1>
                  <UR code="UR-1.1.2 · 1.1.3 · 1.1.4" />
                </div>
                <div className="mt-0.5 text-base text-ink">{headline}</div>
                <div className="mt-1 flex flex-wrap gap-x-1.5 text-sm text-ink-3">
                  {[p.education[0]?.school, p.basics.email, p.basics.phone].filter(Boolean).map((x, i) => (
                    <span key={i}>
                      {i > 0 && <span className="mr-1.5" aria-hidden>·</span>}
                      {x}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-accent">
              <span>{p.experience.length} kinh nghiệm</span>
              <span>{p.skills.length} kỹ năng</span>
              <span>{p.projects.length} dự án</span>
              <span>{p.certifications.length} chứng chỉ</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button href="/cv">Tải CV khác</Button>
              <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-3">
                <IconFile size={14} />
                {p.cv
                  ? `${p.cv.parser === "manual" ? "Hồ sơ" : "Đọc"} từ ${p.cv.fileName}${p.cv.parser === "heuristic" ? " bằng bộ đọc quy tắc" : p.cv.parser === "gemini" ? " bằng Gemini" : ""} · sửa được mọi trường trước khi lưu`
                  : "Nhập thủ công — mọi thông tin được đánh dấu là do bạn bổ sung"}
              </span>
            </div>
          </div>
        </Card>
        {warning && <Notice tone="danger">{warning}</Notice>}

        <Section
          title="Học vấn"
          action={
            <LinkBtn
              onClick={() => {
                const e: Education = { id: uid("edu"), degree: "", school: "", major: "", start: null, end: null, gpa: null, source: "user" };
                setEditing({ kind: "edu", id: e.id, isNew: true });
                edit("education", e);
              }}
            >
              Thêm mục
            </LinkBtn>
          }
        >
          {p.education.length === 0 && <EmptyRow text="Chưa có thông tin học vấn" />}
          <div className="flex flex-col divide-y divide-line-soft">
            {p.education.map((e) =>
              editing?.kind === "edu" && editing.id === e.id ? (
                <EducationForm
                  key={e.id}
                  value={e}
                  onCancel={() => (editing.isNew && remove("education", e.id), setEditing(null))}
                  onDelete={() => (remove("education", e.id), setEditing(null))}
                  onSave={(v) => (edit("education", asUser(v)), setEditing(null))}
                />
              ) : (
                <Row
                  key={e.id}
                  logo={<CompanyLogo name={e.school || e.degree} size={48} />}
                  title={e.school || e.degree}
                  subtitle={e.school ? (e.major && !e.degree.toLowerCase().includes(e.major.toLowerCase()) ? `${e.degree}, ${e.major}` : e.degree) : undefined}
                  meta={`${formatYm(e.start)} – ${formatYm(e.end)}${e.gpa ? ` · GPA ${e.gpa}` : ""}`}
                  source={<SourceTag source={e.source} />}
                  onEdit={() => setEditing({ kind: "edu", id: e.id })}
                />
              ),
            )}
          </div>
        </Section>

        <Section
          title="Kinh nghiệm"
          action={
            <LinkBtn
              onClick={() => {
                const e = newExp(true);
                edit("experience", e);
                setEditing({ kind: "exp", id: e.id, isNew: true });
              }}
            >
              Thêm mục
            </LinkBtn>
          }
        >
          {p.experience.length === 0 && <EmptyRow text="Chưa có kinh nghiệm nào — thực tập, cộng tác viên, việc bán thời gian đều tính" />}
          <div className="flex flex-col divide-y divide-line-soft">
            {p.experience.map((e) =>
              editing?.kind === "exp" && editing.id === e.id ? (
                <ExperienceForm
                  key={e.id}
                  value={e}
                  onCancel={() => (editing.isNew && remove("experience", e.id), setEditing(null))}
                  onDelete={() => (remove("experience", e.id), setEditing(null))}
                  onSave={(v) => (edit("experience", asUser(v)), setEditing(null))}
                />
              ) : (
                <Row
                  key={e.id}
                  logo={<CompanyLogo name={e.company || e.title} size={48} />}
                  title={e.title}
                  subtitle={e.company || undefined}
                  meta={`${period(e.start, e.end)}${e.onCv ? "" : " · không có trên CV"}`}
                  source={<SourceTag source={e.source} onCv={e.onCv} />}
                  onEdit={() => setEditing({ kind: "exp", id: e.id })}
                >
                  {e.bullets.length > 0 && (
                    <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-ink-2 marker:text-ink-5">
                      {e.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                </Row>
              ),
            )}
          </div>
        </Section>

        <Section title="Kỹ năng">
          <div className="flex flex-wrap gap-2">
            {p.skills.map((s) => (
              <span
                key={s.id}
                className={cx("inline-flex h-8 items-center gap-0.5 rounded-full border pl-3.5 text-sm font-semibold", s.source === "user" ? "border-accent/40 bg-accent-soft text-accent-strong" : "border-line bg-muted text-ink-2")}
                title={s.source === "user" ? "Bạn bổ sung" : "Từ CV"}
              >
                {s.name}
                <button type="button" aria-label={`Xoá ${s.name}`} className="flex h-full items-center rounded-r-full px-2.5 text-ink-4 hover:text-ink" onClick={() => update((x) => ({ ...x, skills: x.skills.filter((k) => k.id !== s.id) }))}>
                  <IconX size={12} />
                </button>
              </span>
            ))}
            <form
              className="inline-flex h-8 items-center rounded-full border border-dashed border-ink-5"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newSkill.trim();
                if (!name || p.skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
                update((x) => ({ ...x, skills: [...x.skills, { id: uid("skl"), name, source: "user" }] }));
                setNewSkill("");
              }}
            >
              <IconPlus size={13} className="ml-2.5 text-ink-4" />
              <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Thêm kỹ năng" aria-label="Thêm kỹ năng" className="h-full w-32 bg-transparent px-2 text-sm outline-none placeholder:text-ink-4" />
            </form>
          </div>
          <p className="mt-3 text-xs text-ink-4">Nhấn Enter để thêm. Kỹ năng chỉ ghi tên được tính là bằng chứng yếu — mô tả nó trong Kinh nghiệm hoặc Dự án để mạnh hơn.</p>
        </Section>

        <Section
          title="Dự án"
          action={
            <LinkBtn
              onClick={() => {
                const pr: Project = { id: uid("prj"), name: "", year: null, description: "", source: "user" };
                edit("projects", pr);
                setEditing({ kind: "prj", id: pr.id, isNew: true });
              }}
            >
              Thêm dự án
            </LinkBtn>
          }
        >
          {p.projects.length === 0 && <EmptyRow text="Chưa có dự án" />}
          <div className="flex flex-col divide-y divide-line-soft">
            {p.projects.map((pr) =>
              editing?.kind === "prj" && editing.id === pr.id ? (
                <ProjectForm
                  key={pr.id}
                  value={pr}
                  onCancel={() => (editing.isNew && remove("projects", pr.id), setEditing(null))}
                  onDelete={() => (remove("projects", pr.id), setEditing(null))}
                  onSave={(v) => (edit("projects", asUser(v)), setEditing(null))}
                />
              ) : (
                <Row key={pr.id} title={pr.year ? `${pr.name} — ${pr.year}` : pr.name} source={<SourceTag source={pr.source} />} onEdit={() => setEditing({ kind: "prj", id: pr.id })}>
                  {pr.description && <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{pr.description}</p>}
                </Row>
              ),
            )}
          </div>
        </Section>

        <Section
          title="Chứng chỉ & ngoại ngữ"
          action={
            <LinkBtn
              onClick={() => {
                const c: Certification = { id: uid("cert"), name: "", kind: "cert", score: null, source: "user" };
                edit("certifications", c);
                setEditing({ kind: "cert", id: c.id, isNew: true });
              }}
            >
              Thêm mục
            </LinkBtn>
          }
        >
          {p.certifications.length === 0 && <EmptyRow text="CV không nêu chứng chỉ nào" unknown />}
          <div className="flex flex-col divide-y divide-line-soft">
            {p.certifications.map((c) =>
              editing?.kind === "cert" && editing.id === c.id ? (
                <CertForm
                  key={c.id}
                  value={c}
                  onCancel={() => (editing.isNew && remove("certifications", c.id), setEditing(null))}
                  onDelete={() => (remove("certifications", c.id), setEditing(null))}
                  onSave={(v) => (edit("certifications", asUser(v)), setEditing(null))}
                />
              ) : (
                <Row key={c.id} logo={<CompanyLogo name={c.name} size={40} />} title={c.name} meta={c.kind === "language" ? "Ngoại ngữ" : "Chứng chỉ"} source={<SourceTag source={c.source} />} onEdit={() => setEditing({ kind: "cert", id: c.id })} />
              ),
            )}
          </div>
        </Section>

        <Section title="Thành tích">
          {p.achievements.length === 0 && <EmptyRow text="CV không nêu thành tích nào" unknown />}
          <ul className="flex flex-col divide-y divide-line-soft">
            {p.achievements.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                <span>{a.text}</span>
                <span className="flex items-center gap-3">
                  <SourceTag source={a.source} />
                  <button type="button" aria-label="Xoá" className="text-ink-4 hover:text-ink" onClick={() => update((x) => ({ ...x, achievements: x.achievements.filter((k) => k.id !== a.id) }))}>
                    <IconX size={13} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newAch.trim()) return;
              update((x) => ({ ...x, achievements: [...x.achievements, { id: uid("ach"), text: newAch.trim(), source: "user" }] }));
              setNewAch("");
            }}
          >
            <input className="field h-9 text-sm" placeholder="Thêm thành tích, giải thưởng…" value={newAch} onChange={(e) => setNewAch(e.target.value)} />
            <Button size="sm" type="submit">
              Thêm
            </Button>
          </form>
        </Section>

        {clarified.length > 0 && (
          <Section title="Bạn đã trả lời khi làm rõ">
            <ul className="flex flex-col divide-y divide-line-soft text-sm">
              {clarified.map((c) => (
                <li key={c.key} className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <div className="text-ink">{c.requirementText}</div>
                    <div className="mt-0.5 text-ink-4">
                      {c.answer === "done" ? "Đã từng làm" : "Chưa từng làm"}
                      {[c.where, c.result, c.period].filter(Boolean).length > 0 && ` · ${[c.where, c.result, c.period].filter(Boolean).join(" · ")}`}
                    </div>
                  </div>
                  <button type="button" className="link shrink-0 text-[13px]" onClick={() => update((x) => ({ ...x, clarifications: x.clarifications.filter((k) => k.key !== c.key) }))}>
                    Hỏi lại
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      <aside className="mt-4 flex flex-col gap-4 md:sticky md:top-[84px] md:mt-0">
        <Card className="p-5">
          <Eyebrow>Nguồn của mỗi thông tin</Eyebrow>
          <div className="mt-3 flex flex-col gap-3.5 text-[13px] leading-relaxed text-ink-3">
            <div>
              <SourceTag source="cv" />
              <p className="mt-1.5">Máy đọc được từ tệp bạn tải lên.</p>
            </div>
            <div>
              <SourceTag source="user" />
              <p className="mt-1.5">Bạn tự khai hoặc đã sửa lại. Được tin cậy hơn bản đọc máy.</p>
            </div>
            <div>
              <SourceTag source="unknown" />
              <p className="mt-1.5">Không có thông tin. Hệ thống không tự suy đoán và cũng không kết luận là bạn thiếu.</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-[15px] font-semibold">Năng lực CV chưa thể hiện</div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-3">Việc đã làm nhưng chưa viết vào CV vẫn được tính, miễn là bạn khai ở đây.</p>
          <Button
            block
            size="lg"
            className="mt-4"
            disabled={!!draftExp}
            onClick={() => {
              const e = newExp(false);
              edit("experience", e);
              setEditing({ kind: "exp", id: e.id, isNew: true });
              setTimeout(() => document.getElementById(`item-${e.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
            }}
          >
            Bổ sung năng lực
          </Button>
        </Card>
        <Card className="p-5">
          <p className="text-sm leading-relaxed text-ink-3">Hồ sơ này dùng lại cho mọi JD. CV sẽ không bị đọc lại lần nữa.</p>
          <Button block size="lg" variant="primary" className="mt-4" disabled={saving || (!dirty && !onboarding) || !!editing} onClick={saveAll}>
            {saving && <Spinner />} {onboarding ? "Lưu hồ sơ và tiếp tục" : dirty ? "Lưu hồ sơ" : "Đã lưu"}
          </Button>
          {editing && <p className="mt-2 text-xs text-ink-4">Bấm “Xong” ở mục đang sửa trước khi lưu.</p>}
        </Card>
      </aside>
    </Page>
  );
}

function BasicsForm({ value, onSave, onCancel }: { value: Profile["basics"]; onSave(b: Profile["basics"]): void; onCancel(): void }) {
  const [v, setV] = useState(value);
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Họ tên">
          <input className="field" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="Email">
          <input className="field" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        </Field>
        <Field label="Điện thoại">
          <input className="field" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        </Field>
      </div>
      <FormActions onCancel={onCancel} onSave={() => onSave(v)} />
    </div>
  );
}

function Row({
  title,
  subtitle,
  meta,
  source,
  logo,
  onEdit,
  children,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  source: ReactNode;
  logo?: ReactNode;
  onEdit(): void;
  children?: ReactNode;
}) {
  return (
    <div className="flex gap-3 py-4 first:pt-1 last:pb-0">
      {logo}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold break-words">{title || <span className="font-normal text-ink-5">Chưa đặt tên</span>}</div>
            {subtitle && <div className="text-sm text-ink">{subtitle}</div>}
            {meta && <div className="mt-0.5 text-sm text-ink-3">{meta}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {source}
            <LinkBtn onClick={onEdit}>Sửa</LinkBtn>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyRow({ text, unknown }: { text: string; unknown?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[15px] text-ink-4">
      <span>{text}</span>
      {unknown && <Tag tone="dashed">Chưa đủ dữ liệu</Tag>}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProfileGate />
    </Suspense>
  );
}
