"use client";
import { useState, type ReactNode } from "react";
import { Page } from "@/components/app-shell";
import { IconSplit } from "@/components/icons";
import { JobGate, JobHeader } from "@/components/job";
import { Button, Card, cx, Eyebrow, Notice, PageTitle, SeverityTag, SourceTag, StatusIcon, Tag, UR } from "@/components/ui";
import { GAP_LABEL, STATUS_LABEL, STRENGTH_LABEL, type GapItem, type JobEvaluation } from "@/lib/engine";
import type { Job } from "@/lib/schema";

function coverageTag(g: GapItem): string | null {
  const r = g.result;
  if (r.status === "partial") return r.strength === "weak" || r.strength === "declared" ? STRENGTH_LABEL[r.strength] : "Phủ một phần";
  if (r.status === "missing" || r.status === "unknown") return r.clarification?.answer === "never" ? null : "Chưa có bằng chứng";
  return null;
}

function GapCard({ g, jobId, children }: { g: GapItem; jobId: string; children?: ReactNode }) {
  const r = g.result;
  const critical = g.severity === "critical";
  const cov = coverageTag(g);
  const cvEvidence = r.evidence.filter((e) => e.where !== "Bạn xác nhận khi làm rõ");
  return (
    <Card as="article" className={cx("p-5", critical && "border-t-[3px] border-t-danger")}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] leading-snug font-semibold">{r.req.text}</h3>
        {g.type !== "information" && <SeverityTag severity={g.severity} />}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Tag tone={r.countsAsMust ? "danger" : "neutral"}>{r.countsAsMust ? "Yêu cầu bắt buộc" : r.req.level === "must" ? "Kỹ năng mềm" : "Yêu cầu ưu tiên"}</Tag>
        {g.type !== "evidence" && g.type !== "information" && <Tag>{GAP_LABEL[g.type]}</Tag>}
        {cov && <Tag>{cov}</Tag>}
      </div>
      {g.type === "evidence" && cvEvidence.length > 0 && (
        <div className="mt-3 rounded-md border border-line-soft bg-subtle p-3.5">
          <Eyebrow>Bằng chứng trong CV</Eyebrow>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm leading-relaxed text-ink-2">
            {cvEvidence.slice(0, 3).map((e, i) => (
              <li key={i}>
                <span className="text-ink-4">{e.where}:</span> {e.text}
              </li>
            ))}
          </ul>
        </div>
      )}
      {critical && (
        <div className="mt-3 rounded-md border border-line-soft bg-subtle p-3.5">
          <Eyebrow>Vì sao xếp cao nhất</Eyebrow>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{g.why}</p>
        </div>
      )}
      {r.months && g.type === "experience" && (
        <div className="mt-3 rounded-md border border-line-soft bg-subtle p-3.5">
          <Eyebrow>Bạn đang có</Eyebrow>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{r.months.entries.join(" · ") || "Chưa có mục kinh nghiệm nào có mốc thời gian."}</p>
        </div>
      )}
      <p className="mt-3 text-sm leading-relaxed text-ink-3">{g.detail}</p>
      {!critical && g.severity !== "medium" && g.type !== "evidence" && g.type !== "information" && <p className="mt-2 text-[13px] text-ink-4">{g.why}</p>}
      {children}
      {g.type === "information" && (
        <Button block size="lg" className="mt-4" href={`/jobs/${jobId}/clarify?key=${encodeURIComponent(r.key)}`}>
          Làm rõ tiêu chí này
        </Button>
      )}
    </Card>
  );
}

function Column({ title, count, ur, children, empty }: { title: string; count: number; ur: string; children: ReactNode; empty: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <Tag tone="solid">{count}</Tag>
        </div>
        <UR code={ur} />
      </div>
      {count === 0 && <p className="rounded-lg border border-dashed border-dash bg-surface px-4 py-5 text-sm text-ink-4">{empty}</p>}
      {children}
    </div>
  );
}

function Gaps({ job, ev }: { job: Job; ev: JobEvaluation }) {
  const { gaps, readiness } = ev;
  const firstGap = gaps.items[0]?.result.req.id ?? readiness.results[0]?.req.id ?? null;
  const [selected, setSelected] = useState<string | null>(firstGap);
  const sel = readiness.results.find((r) => r.req.id === selected) ?? null;

  return (
    <Page>
      <JobHeader job={job} ev={ev} active="gaps" />
      <PageTitle
        level={2}
        title="Khoảng trống của bạn"
        ur="UR-2.1 · 2.3 · 2.4"
        actions={
          gaps.information.length > 0 ? (
            <Button variant="primary" size="lg" href={`/jobs/${job.id}/clarify`}>
              Làm rõ {gaps.information.length} tiêu chí còn lại
            </Button>
          ) : (
            <Button variant="primary" size="lg" href={`/jobs/${job.id}/actions`}>
              Xem việc cần làm
            </Button>
          )
        }
      />
      <Notice icon={<IconSplit />}>
        Hai loại khoảng trống <b>không bị cộng chung vào một con số</b>. Việc bạn đã làm nhưng viết chưa tới là chuyện của câu chữ; việc bạn chưa từng làm là chuyện của thời
        gian. Hai thứ đó cần hai cách xử lý khác nhau.
      </Notice>

      {gaps.items.length === 0 ? (
        <Notice tone="accent">Không còn khoảng trống nào với JD này — hồ sơ đã có bằng chứng cho mọi yêu cầu.</Notice>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr_1fr]">
          <Column title="Có năng lực — CV chưa thể hiện" count={gaps.evidence.length} ur="UR-2.3.1" empty="Không có mục nào.">
            {gaps.evidence.map((g) => (
              <GapCard key={g.result.req.id} g={g} jobId={job.id} />
            ))}
          </Column>
          <Column title="Thực sự còn thiếu" count={gaps.real.length} ur="UR-2.3.2 · 2.3.3" empty="Chưa xác định khoảng trống năng lực thật nào.">
            {gaps.real.map((g) => (
              <GapCard key={g.result.req.id} g={g} jobId={job.id} />
            ))}
          </Column>
          <Column title="Chưa đủ dữ liệu" count={gaps.information.length} ur="UR-2.3.6" empty="Mọi tiêu chí đã đủ dữ liệu để kết luận.">
            {gaps.information.map((g) => (
              <GapCard key={g.result.req.id} g={g} jobId={job.id} />
            ))}
            <Card className="p-5">
              <Eyebrow>Thứ tự ưu tiên</Eyebrow>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">
                Khoảng trống gắn với yêu cầu bắt buộc luôn nằm trên. Tiêu chí ưu tiên bị hạ xuống dưới để danh sách việc cần làm không bị loãng.
              </p>
              <UR code="UR-2.4" className="mt-2" />
            </Card>
          </Column>
        </div>
      )}

      <Card className="scroll-mt-24 p-5" as="section">
        <div id="mapping" className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">Đối chiếu yêu cầu ↔ bằng chứng trong CV</h2>
            <p className="text-[13px] text-ink-3">Mở một yêu cầu bất kỳ để xem đúng dòng CV nào đã được dùng để kết luận.</p>
          </div>
          <UR code="UR-2.1.1 → 2.1.4" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {readiness.results.map((r) => (
            <button
              key={r.req.id}
              type="button"
              onClick={() => setSelected(r.req.id)}
              aria-pressed={selected === r.req.id}
              className={cx(
                "flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left text-[13px] font-semibold",
                selected === r.req.id ? "border-accent bg-accent-soft text-accent-strong" : "border-line-strong/60 text-ink-3 hover:bg-muted hover:text-ink",
              )}
            >
              <StatusIcon status={r.status} className="shrink-0" />
              <span className="truncate">{r.req.text}</span>
            </button>
          ))}
        </div>
        {sel && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-line p-4">
              <Eyebrow>Yêu cầu từ JD</Eyebrow>
              <p className="mt-2 text-sm leading-relaxed">{sel.req.text}</p>
              <p className="mt-2 text-xs text-ink-4">
                {sel.countsAsMust ? "Bắt buộc" : "Ưu tiên"} · trọng số × {sel.weight}
              </p>
            </div>
            <div className="rounded-md border border-line p-4">
              <Eyebrow>Dòng CV được dùng</Eyebrow>
              {sel.evidence.length === 0 ? (
                <p className="mt-2 text-sm text-ink-4">Không có dòng nào trong hồ sơ nhắc tới yêu cầu này.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2.5">
                  {sel.evidence.map((e, i) => (
                    <li key={i} className="text-sm leading-relaxed">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-4">
                        {e.where} <SourceTag source={e.source} />
                      </div>
                      <div className="mt-0.5">{e.text}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-md border border-line p-4">
              <Eyebrow>Kết luận</Eyebrow>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                <StatusIcon status={sel.status} />
                {STATUS_LABEL[sel.status]} · {STRENGTH_LABEL[sel.strength].toLowerCase()}
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{sel.reason}</p>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs leading-relaxed text-ink-4">
          Tiêu chí độ mạnh bằng chứng: <b>mạnh</b> — có trong mô tả công việc/dự án kèm số liệu; <b>vừa</b> — có bối cảnh nhưng chưa có kết quả; <b>yếu</b> — chỉ có tên
          trong mục Kỹ năng; <b>bạn tự khai</b> — chưa có trên CV.
        </p>
      </Card>
    </Page>
  );
}

export default function GapsPage() {
  return <JobGate>{(job, ev) => <Gaps job={job} ev={ev} />}</JobGate>;
}
