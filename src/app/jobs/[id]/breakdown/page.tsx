"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { Page } from "@/components/app-shell";
import { IconExternal, IconInfo, IconPlus, IconTrash } from "@/components/icons";
import { JobGate, JobHeader } from "@/components/job";
import { Button, Card, cx, Dialog, Eyebrow, Notice, PageTitle, Tag, UR } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import { deriveRequirement } from "@/lib/extract/jd-heuristic";
import type { JobEvaluation } from "@/lib/engine";
import { KIND_LABEL, locationText, salaryText, SENIORITY_LABEL, workModeText } from "@/lib/format";
import type { Job, Requirement, RequirementKind, WorkMode } from "@/lib/schema";
import { CITIES, findDistricts } from "@/lib/taxonomy";
import { uid } from "@/lib/text";

function unknownCount(job: Job): number {
  const c = job.conditions;
  return [c.salary, c.location, c.workMode, c.hours, c.benefits, c.growth].filter((x) => x === null).length;
}

function Cond({ label, value, ur }: { label: string; value: string | null; ur?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink-3">
        {label} {ur && <UR code={ur} className="ml-1" />}
      </span>
      {value ? <span className="text-right font-medium">{value}</span> : <Tag tone="dashed" className="font-mono">Unknown</Tag>}
    </div>
  );
}

function ReqList({ title, ur, items, preferred }: { title: string; ur: string; items: Requirement[]; preferred?: boolean }) {
  return (
    <Card className="px-5 py-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <Tag tone="solid">{items.length} tiêu chí</Tag>
        </div>
        <UR code={ur} />
      </div>
      {items.length === 0 && <p className="py-2 text-sm text-ink-4">JD không nêu.</p>}
      <ul className="divide-y divide-line-soft">
        {items.map((r) => (
          <li key={r.id} className="flex items-start gap-3 py-3">
            <span className={cx("mt-[7px] h-[7px] w-[7px] shrink-0", preferred ? "border border-ink-4" : "bg-accent")} aria-hidden />
            <span className="flex-1 text-[15px] leading-relaxed">{r.text}</span>
            <span className="shrink-0 pt-0.5 text-xs text-ink-4">{KIND_LABEL[r.kind]}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------------------------------------------------------------- chế độ sửa */

interface EditReq {
  id: string;
  text: string;
  level: Requirement["level"];
  kind: RequirementKind;
  skills: string;
  minYears: string;
  orig: Requirement | null;
}

const KINDS = Object.keys(KIND_LABEL) as RequirementKind[];

function Editor({ job, onDone }: { job: Job; onDone(): void }) {
  const ws = useWorkspace();
  const [reqs, setReqs] = useState<EditReq[]>(
    job.requirements.map((r) => ({ id: r.id, text: r.text, level: r.level, kind: r.kind, skills: r.skills.join(", "), minYears: r.minYears?.toString() ?? "", orig: r })),
  );
  const [resp, setResp] = useState(job.responsibilities.join("\n"));
  const c = job.conditions;
  const [salMin, setSalMin] = useState(c.salary?.min?.toString() ?? "");
  const [salMax, setSalMax] = useState(c.salary?.max?.toString() ?? "");
  const [currency, setCurrency] = useState<"VND" | "USD">(c.salary?.currency ?? "VND");
  const [city, setCity] = useState(c.location?.cities[0] ?? "");
  const [district, setDistrict] = useState(c.location?.districts[0] ?? "");
  const [mode, setMode] = useState<WorkMode | "">(c.workMode?.mode ?? "");
  const [days, setDays] = useState(c.workMode?.onsiteDays?.toString() ?? "");
  const [hours, setHours] = useState(c.hours ?? "");
  const [benefits, setBenefits] = useState(c.benefits?.join("\n") ?? "");
  const [growth, setGrowth] = useState({ training: !!c.growth?.training, promotion: !!c.growth?.promotion, mentor: !!c.growth?.mentor, learningBudget: !!c.growth?.learningBudget });

  const upd = (id: string, patch: Partial<EditReq>) => setReqs((l) => l.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const num = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v.replace(",", "."))) ? null : Number(v.replace(",", ".")));

  const save = async () => {
    const requirements = reqs
      .filter((r) => r.text.trim().length > 2)
      .map((r) => {
        const prev: Requirement = r.orig ?? { id: r.id, text: r.text, level: r.level, kind: r.kind, skills: [], skillMatch: "any", minYears: null, domains: [], degree: null, majors: [], language: null, languageTest: null };
        const unchanged = r.orig && r.orig.text === r.text.trim() && r.orig.kind === r.kind && r.orig.skills.join(", ") === r.skills && (r.orig.minYears?.toString() ?? "") === r.minYears;
        if (unchanged) return { ...r.orig!, level: r.level };
        return deriveRequirement(prev, {
          text: r.text,
          level: r.level,
          kind: r.kind,
          skills: r.skills.split(",").map((s) => s.trim()).filter(Boolean),
          minYears: num(r.minYears),
        });
      });
    const cityName = CITIES.find((x) => x.id === city)?.name ?? "";
    const growthAny = Object.values(growth).some(Boolean);
    const next: Job = {
      ...job,
      requirements,
      responsibilities: resp.split("\n").map((s) => s.trim()).filter(Boolean),
      conditions: {
        salary: num(salMin) !== null || num(salMax) !== null ? { min: num(salMin), max: num(salMax), currency, text: "Bạn sửa" } : null,
        location: city ? { cities: [city], districts: district ? findDistricts(district, [city]).slice(0, 1) : [], text: [district, cityName].filter(Boolean).join(", ") } : null,
        workMode: mode ? { mode, onsiteDays: num(days), text: mode } : null,
        hours: hours.trim() || null,
        benefits: benefits.trim() ? benefits.split("\n").map((s) => s.trim()).filter(Boolean) : null,
        growth: growthAny ? { ...growth, text: "Bạn sửa" } : null,
      },
      editedAt: new Date().toISOString(),
    };
    await ws.saveJob(next);
    ws.toast("Đã lưu kết quả bóc tách — JD được chấm lại theo danh sách mới.");
    onDone();
  };

  const districts = CITIES.find((x) => x.id === city)?.districts ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Card className="px-5 py-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Yêu cầu ứng viên</h2>
          <Button
            size="sm"
            onClick={() => setReqs((l) => [...l, { id: uid("req"), text: "", level: "must", kind: "skill", skills: "", minYears: "", orig: null }])}
          >
            <IconPlus size={13} /> Thêm yêu cầu
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {reqs.map((r) => (
            <div key={r.id} className="grid gap-2 rounded-md border border-line-soft bg-subtle p-3 md:grid-cols-[1fr_130px_140px_auto]">
              <input className="field h-10 text-sm" value={r.text} placeholder="Nội dung yêu cầu" onChange={(e) => upd(r.id, { text: e.target.value })} aria-label="Nội dung yêu cầu" />
              <select className="field h-10 text-sm" value={r.level} onChange={(e) => upd(r.id, { level: e.target.value as Requirement["level"] })} aria-label="Mức">
                <option value="must">Bắt buộc</option>
                <option value="preferred">Ưu tiên</option>
              </select>
              <select className="field h-10 text-sm" value={r.kind} onChange={(e) => upd(r.id, { kind: e.target.value as RequirementKind })} aria-label="Loại">
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
              <button type="button" aria-label="Xoá yêu cầu" className="flex h-10 items-center justify-center px-2 text-ink-4 hover:text-danger" onClick={() => setReqs((l) => l.filter((x) => x.id !== r.id))}>
                <IconTrash />
              </button>
              {(r.kind === "skill" || r.kind === "soft" || r.kind === "certification") && (
                <input
                  className="field h-9 text-[13px] md:col-span-3"
                  value={r.skills}
                  placeholder="Kỹ năng dùng để đối chiếu, cách nhau bằng dấu phẩy (để trống: tự nhận từ nội dung)"
                  onChange={(e) => upd(r.id, { skills: e.target.value })}
                  aria-label="Kỹ năng"
                />
              )}
              {r.kind === "experience" && (
                <input className="field h-9 text-[13px] md:col-span-3" value={r.minYears} inputMode="decimal" placeholder="Số năm tối thiểu (vd. 1 hoặc 0.5)" onChange={(e) => upd(r.id, { minYears: e.target.value })} aria-label="Số năm" />
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="px-5 py-5">
        <h2 className="mb-3 text-[15px] font-semibold">Điều kiện làm việc — để trống nếu JD không nêu</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className="label">Lương từ</span>
            <input className="field" inputMode="decimal" value={salMin} onChange={(e) => setSalMin(e.target.value)} />
          </label>
          <label>
            <span className="label">Lương đến</span>
            <input className="field" inputMode="decimal" value={salMax} onChange={(e) => setSalMax(e.target.value)} />
          </label>
          <label>
            <span className="label">Đơn vị</span>
            <select className="field" value={currency} onChange={(e) => setCurrency(e.target.value as "VND" | "USD")}>
              <option value="VND">Triệu đồng / tháng</option>
              <option value="USD">USD / tháng</option>
            </select>
          </label>
          <label>
            <span className="label">Thành phố</span>
            <select className="field" value={city} onChange={(e) => (setCity(e.target.value), setDistrict(""))}>
              <option value="">Không nêu</option>
              {CITIES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Quận</span>
            <select className="field" value={district} disabled={!districts.length} onChange={(e) => setDistrict(e.target.value)}>
              <option value="">Không nêu</option>
              {districts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Hình thức</span>
            <select className="field" value={mode} onChange={(e) => setMode(e.target.value as WorkMode | "")}>
              <option value="">Không nêu</option>
              <option value="onsite">Onsite</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </label>
          <label>
            <span className="label">Số ngày onsite / tuần</span>
            <input className="field" inputMode="numeric" value={days} disabled={mode === "remote" || !mode} onChange={(e) => setDays(e.target.value)} />
          </label>
          <label className="sm:col-span-2">
            <span className="label">Thời gian làm việc</span>
            <input className="field" value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="label">Phúc lợi — mỗi dòng một ý</span>
          <textarea className="field-area min-h-20" value={benefits} onChange={(e) => setBenefits(e.target.value)} />
        </label>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {(
            [
              ["training", "Có đào tạo"],
              ["promotion", "Có lộ trình thăng tiến"],
              ["mentor", "Có mentor"],
              ["learningBudget", "Ngân sách học tập"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" className="accent-accent" checked={growth[k]} onChange={(e) => setGrowth((g) => ({ ...g, [k]: e.target.checked }))} />
              {label}
            </label>
          ))}
        </div>
      </Card>

      <Card className="px-5 py-5">
        <label>
          <span className="label">Trách nhiệm chính — mỗi dòng một ý</span>
          <textarea className="field-area min-h-28" value={resp} onChange={(e) => setResp(e.target.value)} />
        </label>
      </Card>

      <div className="flex justify-end gap-2.5">
        <Button variant="muted" size="lg" onClick={onDone}>
          Huỷ
        </Button>
        <Button size="lg" variant="primary" onClick={save}>
          Lưu kết quả bóc tách
        </Button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- trang */

function Breakdown({ job, ev }: { job: Job; ev: JobEvaluation }) {
  const router = useRouter();
  const params = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(false);
  const unknown = unknownCount(job);
  const must = job.requirements.filter((r) => r.level === "must");
  const pref = job.requirements.filter((r) => r.level === "preferred");
  const g = job.conditions.growth;
  const growthText = g ? [g.training && "Đào tạo", g.promotion && "Thăng tiến", g.mentor && "Mentor", g.learningBudget && "Ngân sách học"].filter(Boolean).join(", ") : null;

  const side: ReactNode = (
    <aside className="mt-4 flex flex-col gap-4 md:mt-0">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <Eyebrow>Điều kiện làm việc</Eyebrow>
          <UR code="UR-1.3.6" />
        </div>
        <div className="mt-2">
          <Cond label="Mức lương" value={salaryText(job)} />
          <Cond label="Địa điểm" value={locationText(job)} />
          <Cond label="Hình thức" value={workModeText(job)} />
          <Cond label="Thời gian làm việc" value={job.conditions.hours} />
          <Cond label="Phúc lợi" value={job.conditions.benefits ? `${job.conditions.benefits.length} mục` : null} />
          <Cond label="Đào tạo / thăng tiến" value={growthText} />
        </div>
        {job.conditions.benefits && (
          <ul className="mt-2 list-disc border-t border-line-soft pt-3 pl-5 text-[13px] leading-relaxed text-ink-3">
            {job.conditions.benefits.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <Eyebrow>Mức seniority</Eyebrow>
          <UR code="UR-1.3.5" />
        </div>
        <div className="mt-2 text-[17px] font-semibold">{SENIORITY_LABEL[job.seniority.level]}</div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{job.seniority.basis}</p>
      </Card>
      <Card className="p-5">
        <p className="text-sm leading-relaxed text-ink-3">Sửa lại các tiêu chí bị bóc tách sai trước khi chấm điểm — kết quả chấm dựa trên danh sách này.</p>
        <Button block size="lg" variant="primary" className="mt-4" onClick={() => router.push(`/jobs/${job.id}`)}>
          Đánh giá hai chiều
        </Button>
        <p className="mt-3 text-xs text-ink-4">
          Bóc tách bằng {job.extractedBy === "gemini" ? "Gemini" : "bộ đọc quy tắc"}
          {job.editedAt ? " · bạn đã sửa" : ""}.
        </p>
      </Card>
    </aside>
  );

  return (
    <Page>
      <JobHeader job={job} ev={ev} active="breakdown" />
      <PageTitle
        level={2}
        title={editing ? "Sửa kết quả bóc tách" : "JD đã bóc tách"}
        ur="UR-1.3.1 → 1.3.7"
        sub={editing ? "Sửa, thêm hoặc xoá tiêu chí. Kết quả chấm dựa trên danh sách này." : `Bóc tách bằng ${job.extractedBy === "gemini" ? "Gemini" : "bộ đọc quy tắc"}${job.editedAt ? " · bạn đã sửa" : ""}.`}
        actions={
          !editing && (
            <>
              <Button variant="muted" onClick={() => setRaw(true)}>
                Xem JD gốc
              </Button>
              <Button onClick={() => setEditing(true)}>Sửa kết quả bóc tách</Button>
            </>
          )
        }
      />
      {params.get("new") && !editing && (
        <Notice tone="accent">
          Đã bóc tách xong. Kiểm tra nhanh các tiêu chí dưới đây — nếu có chỗ sai, bấm <b>Sửa kết quả bóc tách</b> trước khi xem đánh giá.
        </Notice>
      )}
      {unknown > 0 && !editing && (
        <Notice icon={<IconInfo />}>
          <b>{unknown} thông tin JD không nêu</b> — được giữ nguyên trạng thái <span className="font-mono text-[13px]">Unknown</span>. Hệ thống không tự điền giá trị suy đoán và cũng
          không tính chúng là đạt.
        </Notice>
      )}
      {editing ? (
        <Editor job={job} onDone={() => setEditing(false)} />
      ) : (
        <div className="md:grid md:grid-cols-[1fr_328px] md:items-start md:gap-5">
          <div className="flex flex-col gap-4">
            <ReqList title="Yêu cầu bắt buộc" ur="UR-1.3.2" items={must} />
            <ReqList title="Yêu cầu ưu tiên" ur="UR-1.3.3" items={pref} preferred />
            <Card className="px-5 py-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">Trách nhiệm chính của vị trí</h2>
                <UR code="UR-1.3.4" />
              </div>
              {job.responsibilities.length === 0 && <p className="text-sm text-ink-4">JD không nêu.</p>}
              <ul className="flex flex-col gap-2">
                {job.responsibilities.map((r, i) => (
                  <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                    <span className="mt-[9px] h-[5px] w-[5px] shrink-0 bg-ink-5" aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          {side}
        </div>
      )}
      <Dialog open={raw} onClose={() => setRaw(false)} title="JD gốc" wide>
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="link mb-3 inline-flex items-center gap-1.5 text-sm">
            Mở tin gốc <IconExternal size={13} />
          </a>
        )}
        <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-ink-2">{job.rawText}</pre>
      </Dialog>
    </Page>
  );
}

export default function BreakdownPage() {
  return (
    <Suspense>
      <JobGate>{(job, ev) => <Breakdown job={job} ev={ev} />}</JobGate>
    </Suspense>
  );
}
