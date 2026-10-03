"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Page } from "@/components/app-shell";
import { IconCheckCircle, IconShield, IconWarning } from "@/components/icons";
import { JobGate, JobHeader } from "@/components/job";
import { Button, Card, cx, Eyebrow, Notice, PageTitle, SeverityTag, Spinner, Tag, UR } from "@/components/ui";
import { useEvaluations, useWorkspace } from "@/components/workspace";
import { applySuggestion } from "@/lib/apply";
import { checkDraft, evaluateJob, GAP_LABEL, portfolio, snapshot, type BuildItem, type FixSuggestion, type JobEvaluation } from "@/lib/engine";
import type { Job, Profile } from "@/lib/schema";
import { skillName } from "@/lib/taxonomy";

function FixCard({ s, job, profile }: { s: FixSuggestion; job: Job; profile: Profile }) {
  const ws = useWorkspace();
  const state = job.suggestions[s.id];
  const [text, setText] = useState(state?.text || s.draft);
  const [aiBusy, setAiBusy] = useState(false);
  const approved = state?.status === "approved";
  const check = useMemo(() => checkDraft(text, profile, s.sources, s.skillId ? [s.skillId] : []), [text, profile, s]);
  const editable = s.kind === "rewrite" || s.kind === "add-evidence";

  const setState = (next: Job["suggestions"][string] | null) => {
    const suggestions = { ...job.suggestions };
    if (next) suggestions[s.id] = next;
    else delete suggestions[s.id];
    return ws.saveJob({ ...job, suggestions });
  };

  const aiRewrite = async () => {
    if (!s.skillId) return;
    setAiBusy(true);
    try {
      const exp = profile.experience.find((e) => e.id === s.experienceId);
      const res = await fetch("/api/cv/rewrite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bullet: s.current ?? "", skill: skillName(s.skillId), requirement: s.addresses, role: exp ? `${exp.title} — ${exp.company}` : "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không viết lại được.");
      setText(data.draft);
      if (data.warning) ws.toast(data.warning, "error");
    } catch (e) {
      ws.toast(e instanceof Error ? e.message : "Không viết lại được.", "error");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <Card as="article" className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] leading-snug font-semibold">{s.title}</h3>
          <p className="mt-1 text-[13px] text-ink-3">Xử lý khoảng trống: {s.addresses}</p>
        </div>
        <UR code={s.kind === "rewrite" ? "UR-2.5.3" : s.kind === "total-line" ? "UR-2.5.1" : "UR-2.5.2"} />
      </div>

      {s.current && (
        <div className="mt-3 rounded-md border border-line-soft bg-subtle p-3.5">
          <Eyebrow>Bản hiện tại</Eyebrow>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{s.current}</p>
        </div>
      )}
      {s.kind === "total-line" ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-2">{s.basis}</p>
      ) : null}
      <div className="mt-3 rounded-md border border-line p-3.5">
        <div className="flex items-center justify-between gap-2">
          <Eyebrow>{s.kind === "show-experience" ? "Mục cần đưa vào CV" : s.kind === "total-line" ? "Dòng gợi ý" : "Gợi ý viết lại"}</Eyebrow>
          {s.kind === "rewrite" && ws.health?.gemini && !approved && (
            <button type="button" className="link flex items-center gap-1.5 text-xs" disabled={aiBusy} onClick={aiRewrite}>
              {aiBusy && <Spinner className="h-3 w-3" />} Viết lại bằng AI
            </button>
          )}
        </div>
        {editable && !approved ? (
          <textarea className="field-area mt-2 min-h-20 text-sm" value={text} onChange={(e) => setText(e.target.value)} aria-label="Nội dung gợi ý" />
        ) : (
          <p className="mt-1.5 text-sm leading-relaxed">{approved ? state.text : text}</p>
        )}
        <p className="mt-2 text-xs leading-relaxed text-ink-4">{s.note}</p>
        {!approved && (check.placeholders.length > 0 || check.unsupportedSkills.length > 0 || check.newNumbers.length > 0) && (
          <ul className="mt-2 flex flex-col gap-1 text-xs leading-relaxed">
            {check.placeholders.length > 0 && <li className="text-ink-2">• Còn {check.placeholders.length} chỗ trong [ ] cần tự điền hoặc xoá trước khi duyệt.</li>}
            {check.unsupportedSkills.length > 0 && (
              <li className="text-danger-strong">• Nhắc tới {check.unsupportedSkills.join(", ")} — hồ sơ chưa có kỹ năng này, không được đưa vào (UR-2.5.6).</li>
            )}
            {check.newNumbers.length > 0 && <li className="text-ink-2">• Số liệu {check.newNumbers.join(", ")} chưa có trong hồ sơ — chỉ giữ nếu đúng sự thật.</li>}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-ink-4 sm:max-w-[55%]">{s.kind === "total-line" ? s.note : s.basis}</p>
        {approved ? (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <IconCheckCircle /> {state.applied ? "Đã ghi vào hồ sơ" : "Đã duyệt"}
            </span>
            {!state.applied && <Button onClick={() => setState(null)}>Hoàn tác</Button>}
          </div>
        ) : state?.status === "dismissed" ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-4">Đã bỏ qua</span>
            <Button onClick={() => setState(null)}>Hoàn tác</Button>
          </div>
        ) : (
          <div className="flex gap-2.5">
            <Button variant="muted" onClick={() => setState({ status: "dismissed", text: "", applied: false })}>Bỏ</Button>
            <Button variant="primary" disabled={editable && check.blocking} onClick={() => setState({ status: "approved", text: text.trim(), applied: false })}>
              Duyệt
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function BuildCard({ b, affects, total }: { b: BuildItem; affects: number; total: number }) {
  const g = b.gap;
  return (
    <Card as="article" className={cx("p-5", g.severity === "critical" && "border-t-[3px] border-t-danger")}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] leading-snug font-semibold">{b.title}</h3>
        <SeverityTag severity={g.severity} />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Tag tone={g.result.countsAsMust ? "danger" : "neutral"}>{g.result.countsAsMust ? "Yêu cầu bắt buộc" : "Yêu cầu ưu tiên"}</Tag>
        <Tag>{GAP_LABEL[g.type]}</Tag>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">{b.body}</p>
      {total > 1 && affects > 1 && (
        <div className="mt-3 rounded-md border border-line-soft bg-subtle px-3.5 py-2.5 text-[13px] text-ink-3">
          Ảnh hưởng tới {affects} trong {total} JD bạn đang theo dõi.
        </div>
      )}
    </Card>
  );
}

function Actions({ job, ev }: { job: Job; ev: JobEvaluation }) {
  const ws = useWorkspace();
  const router = useRouter();
  const evals = useEvaluations();
  const [applying, setApplying] = useState(false);
  const profile = ws.profile!;
  const pf = useMemo(() => portfolio(ws.jobs.map((j) => ({ job: j, ev: evals.get(j.id)! })).filter((x) => x.ev)), [ws.jobs, evals]);

  const visibleFix = ev.fixNow;
  const approvedPending = visibleFix.filter((s) => job.suggestions[s.id]?.status === "approved" && !job.suggestions[s.id]?.applied);
  const approvedCount = visibleFix.filter((s) => job.suggestions[s.id]?.status === "approved").length;

  const applyApproved = async () => {
    setApplying(true);
    try {
      let next = profile;
      for (const s of approvedPending) next = applySuggestion(next, s, job.suggestions[s.id].text);
      const suggestions = { ...job.suggestions };
      for (const s of approvedPending) suggestions[s.id] = { ...suggestions[s.id], applied: true };
      const before = ev.readiness.score;
      const after = evaluateJob(next, ws.preferences!, job).readiness.score;
      await ws.saveProfile(next);
      await ws.saveJob({ ...job, suggestions });
      ws.toast(`Đã ghi ${approvedPending.length} mục vào hồ sơ năng lực. Mức sẵn sàng: ${before ?? "—"} → ${after ?? "—"}.`);
    } finally {
      setApplying(false);
    }
  };

  const rescore = async () => {
    await ws.saveJob({ ...job, scoreHistory: [...job.scoreHistory, snapshot(ev)].slice(-20) });
    router.push(`/jobs/${job.id}`);
  };

  return (
    <Page>
      <JobHeader job={job} ev={ev} active="actions" />
      <PageTitle level={2} title="Việc cần làm" ur="UR-2.5 · 2.6" sub="Hôm nay làm gì, và tháng tới làm gì — hai việc khác nhau nên nằm ở hai cột khác nhau." />
      <Notice icon={<IconShield />}>
        Mọi gợi ý dưới đây chỉ dựa trên <b>bằng chứng bạn đã cung cấp hoặc xác nhận</b>. Hệ thống không đề xuất thêm kỹ năng, kinh nghiệm hay thành tích mà bạn chưa thực sự
        có, và nội dung viết lại phải được bạn duyệt trước khi vào CV. <UR code="UR-2.5.6" />
      </Notice>
      {ev.gaps.information.length > 0 && (
        <Notice icon={<IconWarning />}>
          Còn {ev.gaps.information.length} tiêu chí chưa đủ dữ liệu nên chưa xếp vào cột nào.{" "}
          <a className="link" href={`/jobs/${job.id}/clarify`}>
            Làm rõ để hoàn thiện danh sách
          </a>
        </Notice>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-semibold">Sửa được ngay</h2>
              <Tag tone="solid">{visibleFix.length} việc</Tag>
            </div>
            <UR code="UR-2.6.1" />
          </div>
          <p className="px-0.5 text-sm text-ink-3">Năng lực bạn đã có, chỉ là CV chưa nói ra. Sửa xong là điểm sẵn sàng lên ngay.</p>
          {visibleFix.length === 0 && <p className="rounded-lg border border-dashed border-dash bg-surface px-4 py-5 text-sm text-ink-4">Không có mục nào cần sửa câu chữ.</p>}
          {visibleFix.map((s) => (
            <FixCard key={s.id} s={s} job={job} profile={profile} />
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-semibold">Cần xây dựng trước</h2>
              <Tag tone="solid">{ev.buildFirst.length} việc</Tag>
            </div>
            <UR code="UR-2.6.2" />
          </div>
          <p className="px-0.5 text-sm text-ink-3">Năng lực chưa có thật. Không sửa được bằng câu chữ — phải làm rồi mới viết vào CV.</p>
          {ev.buildFirst.length === 0 && <p className="rounded-lg border border-dashed border-dash bg-surface px-4 py-5 text-sm text-ink-4">Chưa xác định năng lực nào cần xây dựng thêm.</p>}
          {ev.buildFirst.map((b) => (
            <BuildCard key={b.gap.result.req.id} b={b} affects={pf.affects(b.gap.result.key)} total={pf.total} />
          ))}
          <div className="rounded-lg border border-dashed border-dash bg-surface/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-ink-3">Lộ trình chi tiết cho từng năng lực</div>
              <Tag tone="dashed">Giai đoạn sau</Tag>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-4">
              Gợi ý tài nguyên học, mốc thời gian và theo dõi tiến độ thuộc nhóm tính năng 3 — nằm ngoài phạm vi lát cắt hiện tại.
            </p>
          </div>
        </section>
      </div>

      <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <p className="text-[13px] leading-relaxed text-ink-3">
          {approvedCount} / {visibleFix.length} gợi ý đã duyệt. Mục đã duyệt sẽ được ghi vào hồ sơ năng lực, không tự ghi đè CV gốc của bạn.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Button size="lg" onClick={rescore}>
            Chấm lại JD này
          </Button>
          <Button size="lg" variant="primary" disabled={approvedPending.length === 0 || applying} onClick={applyApproved}>
            {applying && <Spinner />} Áp dụng mục đã duyệt
          </Button>
        </div>
      </Card>
    </Page>
  );
}

export default function ActionsPage() {
  return <JobGate>{(job, ev) => <Actions job={job} ev={ev} />}</JobGate>;
}
