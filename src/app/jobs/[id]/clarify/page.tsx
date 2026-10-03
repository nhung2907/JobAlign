"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Page } from "@/components/app-shell";
import { JobGate, JobHeader } from "@/components/job";
import { Button, Card, cx, Eyebrow, Notice, PageTitle, Spinner, Tag, UR } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import type { JobEvaluation, RequirementResult } from "@/lib/engine";
import { jobLabel } from "@/lib/format";
import type { Clarification, Job } from "@/lib/schema";

type Answer = Clarification["answer"];

function wording(r: RequirementResult) {
  const k = r.req.kind;
  if (r.key === "exp:years")
    return { q: "Bạn đã có kinh nghiệm làm việc — kể cả thực tập, cộng tác viên — chưa?", done: "Đã có", never: "Chưa có", where: "Làm ở đâu, vị trí gì?", evidence: true };
  if (k === "language") return { q: "Bạn có đáp ứng yêu cầu ngoại ngữ này không?", done: "Có — đáp ứng được", never: "Chưa đáp ứng", where: "Bằng chứng (vd. từng dùng ở đâu, chứng chỉ)", evidence: true };
  if (k === "qualification") return { q: "Bạn có bằng cấp này không?", done: "Có", never: "Chưa có", where: "Trường, chuyên ngành", evidence: true };
  if (k === "certification") return { q: "Bạn có chứng chỉ này không?", done: "Có", never: "Chưa có", where: "Tên chứng chỉ, nơi cấp", evidence: true };
  if (k === "other") return { q: "Bạn có đáp ứng được yêu cầu này không?", done: "Có — đáp ứng được", never: "Chưa đáp ứng", where: "", evidence: false };
  return { q: "Bạn đã từng làm việc này chưa?", done: "Đã từng làm", never: "Chưa từng làm", where: "Bạn làm việc đó ở đâu?", evidence: true };
}

function Clarify({ job, ev }: { job: Job; ev: JobEvaluation }) {
  const ws = useWorkspace();
  const params = useSearchParams();
  // Hàng đợi cố định lúc mở trang: câu trả lời không làm thứ tự nhảy giữa chừng.
  const [queue] = useState<RequirementResult[]>(() => {
    const unknown = ev.readiness.results.filter((r) => r.status === "unknown");
    const rank = (r: RequirementResult) => (r.countsAsMust ? 0 : r.req.kind === "soft" ? 2 : 1) + (r.clarification?.answer === "skip" ? 3 : 0);
    const list = [...unknown].sort((a, b) => rank(a) - rank(b));
    const first = params.get("key");
    const i = first ? list.findIndex((r) => r.key === first) : -1;
    if (i > 0) list.unshift(...list.splice(i, 1));
    return list;
  });
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<Answer | null>(null);
  const [where, setWhere] = useState("");
  const [result, setResult] = useState("");
  const [period, setPeriod] = useState("");
  const [saving, setSaving] = useState(false);
  const [answered, setAnswered] = useState<Record<Answer, number>>({ done: 0, never: 0, skip: 0 });

  const cur = queue[index];
  const total = queue.length;

  const submit = async (a: Answer) => {
    if (!cur) return;
    setSaving(true);
    try {
      await ws.answer({
        key: cur.key,
        requirementText: cur.req.text,
        answer: a,
        where: a === "done" ? where.trim() : "",
        result: a === "done" ? result.trim() : "",
        period: a === "done" ? period.trim() : "",
        answeredAt: new Date().toISOString(),
      });
      setAnswered((x) => ({ ...x, [a]: x[a] + 1 }));
      setIndex((i) => i + 1);
      setChoice(null);
      setWhere("");
      setResult("");
      setPeriod("");
    } finally {
      setSaving(false);
    }
  };

  const side = (
    <aside className="mt-4 flex flex-col gap-4 md:mt-[6px]">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <Eyebrow>Câu trả lời dẫn tới đâu</Eyebrow>
          <UR code="UR-2.2.4" />
        </div>
        <dl className="mt-3 flex flex-col gap-4 text-[13px] leading-relaxed">
          <div className="border-l-2 border-accent pl-3">
            <dt className="font-semibold">Đã từng làm</dt>
            <dd className="text-ink-3">Khoảng trống thể hiện trên CV → nằm trong nhóm sửa được ngay.</dd>
          </div>
          <div className="border-l-2 border-danger pl-3">
            <dt className="font-semibold">Chưa từng làm</dt>
            <dd className="text-ink-3">Khoảng trống năng lực thật → nằm trong nhóm phải xây dựng trước.</dd>
          </div>
          <div className="border-l-2 border-dashed border-ink-5 pl-3">
            <dt className="font-semibold">Bỏ qua</dt>
            <dd className="text-ink-3">Giữ nguyên chưa đủ dữ liệu. Điểm sẵn sàng ghi nhận độ tin cậy thấp hơn, không trừ điểm oan.</dd>
          </div>
        </dl>
      </Card>
      <Card className="p-5">
        <Eyebrow>Chỉ hỏi khi cần</Eyebrow>
        <p className="mt-2 text-sm leading-relaxed text-ink-3">Hệ thống chỉ hỏi những tiêu chí đang thiếu dữ liệu, không hỏi lại thứ CV đã trả lời được.</p>
      </Card>
    </aside>
  );

  if (total === 0 || !cur) {
    return (
      <Page narrow>
        <JobHeader job={job} ev={ev} active="clarify" />
        <PageTitle level={2} title="Làm rõ thông tin" ur="UR-2.2" />
        <Notice tone="accent">
          {total === 0 ? (
            "Không còn tiêu chí nào thiếu dữ liệu ở JD này."
          ) : (
            <>
              Đã xong {total} câu: {answered.done} đã từng làm, {answered.never} chưa từng làm, {answered.skip} bỏ qua. Câu trả lời đã lưu vào hồ sơ năng lực — các JD
              khác có cùng tiêu chí sẽ không hỏi lại.
            </>
          )}
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button variant="primary" href={`/jobs/${job.id}/gaps`}>
              Xem khoảng trống
            </Button>
            <Button href={`/jobs/${job.id}`}>Về kết quả hai chiều</Button>
          </div>
        </Notice>
      </Page>
    );
  }

  const w = wording(cur);
  const options: { value: Answer; label: string; hint: string }[] = [
    { value: "done", label: w.done, hint: cur.req.kind === "other" ? "Tính là đạt yêu cầu này" : "Chuyển thành khoảng trống ở phần thể hiện CV — sửa được ngay bằng câu chữ" },
    { value: "never", label: w.never, hint: "Chuyển thành khoảng trống năng lực thật — đưa vào nhóm cần xây dựng trước" },
    { value: "skip", label: "Không chắc — bỏ qua câu này", hint: "Giữ nguyên trạng thái chưa đủ dữ liệu, không bị tính là thiếu năng lực" },
  ];

  return (
    <Page className="md:grid md:grid-cols-[1fr_300px] md:items-start md:gap-x-5">
      <div className="md:col-span-2">
        <JobHeader job={job} ev={ev} active="clarify" />
      </div>
      <div className="flex flex-col gap-4">
        <PageTitle
          level={2}
          title="Làm rõ thông tin"
          ur="UR-2.2"
          sub={`${total} tiêu chí đang ở trạng thái chưa đủ dữ liệu. Trả lời để hệ thống không kết luận nhầm.`}
        />
        <div>
          <div className="mb-1.5 text-right text-[13px] text-ink-4">
            Câu {index + 1} / {total}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
          </div>
        </div>
        <Card className="p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={cur.countsAsMust ? "danger" : "neutral"}>{cur.countsAsMust ? "Yêu cầu bắt buộc" : "Yêu cầu ưu tiên"}</Tag>
            <span className="text-[13px] text-ink-4">{jobLabel(job)}</span>
          </div>
          <h2 className="mt-3 text-lg leading-snug font-semibold">{cur.req.text}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-3">
            {cur.clarification?.answer === "skip"
              ? "Bạn đã bỏ qua câu này trước đó. Trả lời nếu giờ bạn đã chắc."
              : "CV của bạn không nhắc tới việc này. Trước khi kết luận bạn thiếu năng lực, hệ thống hỏi lại — nhiều người đã làm nhưng không viết vào CV."}
          </p>

          <fieldset className="mt-5 border-t border-line-soft pt-5">
            <legend className="eyebrow mb-3">{w.q}</legend>
            <div className="flex flex-col gap-2.5">
              {options.map((o) => (
                <label
                  key={o.value}
                  className={cx("flex cursor-pointer items-start gap-3.5 rounded-lg border px-4 py-3.5", choice === o.value ? "border-accent bg-accent-soft" : "border-line-strong hover:border-ink-4")}
                >
                  <input type="radio" name="answer" className="mt-1 h-4 w-4 accent-accent" checked={choice === o.value} onChange={() => setChoice(o.value)} />
                  <span>
                    <span className="block text-[15px] font-medium">{o.label}</span>
                    <span className="block text-[13px] text-ink-3">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {choice === "done" && w.evidence && (
            <div className="mt-4 rounded-md border border-line-soft bg-subtle p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">Kể thêm một chút để hệ thống dùng làm bằng chứng</div>
                <UR code="UR-2.2.3" />
              </div>
              <p className="text-[13px] text-ink-4">Không bắt buộc — nhưng có chi tiết thì gợi ý sửa CV sẽ sát hơn.</p>
              <label className="mt-3 block">
                <span className="label">{w.where}</span>
                <input className="field" placeholder="Ví dụ: khi thực tập ở Công ty ABC" value={where} onChange={(e) => setWhere(e.target.value)} />
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="label">
                    Kết quả cụ thể <span className="text-ink-5">— nếu nhớ</span>
                  </span>
                  <input className="field" placeholder="Ví dụ: tăng tỉ lệ mở mail 18%" value={result} onChange={(e) => setResult(e.target.value)} />
                </label>
                <label>
                  <span className="label">Khoảng thời gian</span>
                  <input className="field" placeholder="Ví dụ: 09/2024 - 12/2024" value={period} onChange={(e) => setPeriod(e.target.value)} />
                </label>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] leading-relaxed text-ink-3 sm:max-w-xs">Câu trả lời được lưu vào hồ sơ năng lực. Các JD sau sẽ không hỏi lại tiêu chí này.</p>
            <div className="flex gap-2.5">
              <Button size="lg" disabled={saving} onClick={() => submit("skip")}>
                Bỏ qua
              </Button>
              <Button size="lg" variant="primary" disabled={!choice || saving} onClick={() => choice && submit(choice)}>
                {saving && <Spinner />} {index + 1 < total ? "Lưu & câu tiếp theo" : "Lưu & hoàn tất"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
      {side}
    </Page>
  );
}

export default function ClarifyPage() {
  return (
    <Suspense>
      <JobGate>{(job, ev) => <Clarify job={job} ev={ev} />}</JobGate>
    </Suspense>
  );
}
