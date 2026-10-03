"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Page } from "@/components/app-shell";
import { IconFile, IconLink, IconUpload } from "@/components/icons";
import { Button, Card, cx, Eyebrow, Loading, Notice, PageTitle, Spinner } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import { makeJob } from "@/lib/jobs";
import type { Job, JobExtraction } from "@/lib/schema";
import { contentHash } from "@/lib/text";
import { relativeDay } from "@/lib/format";

type Tab = "paste" | "file" | "url";

interface AnalyzeResponse {
  extraction: JobExtraction;
  extractedBy: Job["extractedBy"];
  contentHash: string;
  warning: string | null;
  rawText: string;
  url?: string;
  error?: string;
}

export default function NewJobPage() {
  const ws = useWorkspace();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("paste");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!ws.ready) return <Loading />;
  if (!ws.profile || !ws.preferences) {
    return (
      <Page narrow>
        <PageTitle title="Phân tích JD mới" ur="UR-1.3" />
        <Notice>
          JD được chấm theo hồ sơ năng lực và kỳ vọng của bạn, nên cần hoàn tất hai bước này trước.
          <div className="mt-3 flex gap-2.5">
            <Button variant="primary" href={ws.profile ? "/preferences" : "/cv"}>
              {ws.profile ? "Khai kỳ vọng" : "Tải CV"}
            </Button>
          </div>
        </Notice>
      </Page>
    );
  }

  const findExisting = (hash: string, link?: string) => ws.jobs.find((j) => j.contentHash === hash || (link && j.url === link));

  async function submit() {
    setError(null);
    if (tab === "paste") {
      const existing = findExisting(contentHash(text));
      if (existing) {
        ws.toast("JD này đã được phân tích trước đó — mở lại kết quả đã lưu, không xử lý lại.");
        router.push(`/jobs/${existing.id}`);
        return;
      }
    }
    if (tab === "url") {
      const existing = findExisting("", url.trim());
      if (existing) {
        ws.toast("Tin này đã được nhập trước đó — mở lại kết quả đã lưu.");
        router.push(`/jobs/${existing.id}`);
        return;
      }
    }
    setBusy(true);
    try {
      let res: Response;
      if (tab === "paste") {
        res = await fetch("/api/jd/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, title, company }) });
      } else if (tab === "file") {
        const form = new FormData();
        form.append("file", file!);
        form.append("title", title);
        form.append("company", company);
        res = await fetch("/api/jd/analyze", { method: "POST", body: form });
      } else {
        res = await fetch("/api/jd/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: url.trim() }) });
      }
      const data = (await res.json()) as AnalyzeResponse;
      if (!res.ok) throw new Error(data.error ?? "Không phân tích được JD.");
      const existing = findExisting(data.contentHash);
      if (existing) {
        ws.toast("JD này đã được phân tích trước đó — mở lại kết quả đã lưu.");
        router.push(`/jobs/${existing.id}`);
        return;
      }
      const extraction = { ...data.extraction, title: title.trim() || data.extraction.title, company: company.trim() || data.extraction.company };
      const job = makeJob(extraction, { rawText: data.rawText, source: tab, url: data.url ?? null, extractedBy: data.extractedBy });
      await ws.saveJob(job);
      if (data.warning) ws.toast(data.warning, "error");
      router.push(`/jobs/${job.id}/breakdown?new=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không phân tích được JD.");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = !busy && (tab === "paste" ? text.trim().length >= 80 : tab === "file" ? !!file : /^https:\/\//.test(url.trim()));
  const recent = [...ws.jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const TABS: { id: Tab; label: string; icon: typeof IconFile }[] = [
    { id: "paste", label: "Dán văn bản", icon: IconFile },
    { id: "file", label: "Tải tệp PDF / DOCX", icon: IconUpload },
    { id: "url", label: "Dán link tin", icon: IconLink },
  ];

  return (
    <Page narrow className="md:grid md:grid-cols-[1fr_300px] md:items-start md:gap-7">
      <div className="flex flex-col gap-4">
        <PageTitle title="Phân tích JD mới" ur="UR-1.3" sub="Dán nguyên văn tin tuyển dụng. Không cần cắt gọt, hệ thống tự tách yêu cầu bắt buộc và yêu cầu ưu tiên." />
        <div>
          <div role="tablist" className="mb-3 flex gap-2 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => (setTab(t.id), setError(null))}
                className={cx(
                  "flex h-8 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                  tab === t.id ? "border-success-strong bg-success-strong text-white" : "border-line-strong/70 bg-surface text-ink-3 hover:bg-muted hover:text-ink",
                )}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>
          <Card className="flex flex-col gap-4 p-5">
            {tab === "paste" && (
              <textarea
                className="field-area min-h-[300px]"
                placeholder="Dán toàn bộ nội dung JD vào đây…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label="Nội dung JD"
              />
            )}
            {tab === "file" && (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-dash text-center hover:border-accent hover:bg-accent-soft/40"
              >
                <IconUpload size={26} className="text-ink-4" />
                <span className="text-[15px] font-medium">{file ? file.name : "Chọn tệp JD"}</span>
                <span className="text-[13px] text-ink-4">PDF, DOCX hoặc TXT · tối đa 10 MB</span>
                <input
                  ref={fileInput}
                  type="file"
                  hidden
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </button>
            )}
            {tab === "url" && (
              <div className="flex flex-col gap-2">
                <label>
                  <span className="label">Link tin tuyển dụng</span>
                  <input className="field" type="url" placeholder="https://www.topcv.vn/viec-lam/…" value={url} onChange={(e) => setUrl(e.target.value)} />
                </label>
                <p className="text-xs leading-relaxed text-ink-4">
                  Hỗ trợ ITviec, TopDev, VietnamWorks, CareerLink, TopCV, JobsGO, Glints, CareerViet, LinkedIn. Hệ thống chỉ tải đúng trang bạn dán, không lưu
                  HTML gốc. Nếu trang chặn truy cập, hãy dán nội dung JD.
                </p>
              </div>
            )}
            {tab !== "url" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="label">
                    Tên vị trí <span className="text-ink-5">— không bắt buộc</span>
                  </span>
                  <input className="field" placeholder="Để trống nếu muốn hệ thống tự nhận" value={title} onChange={(e) => setTitle(e.target.value)} />
                </label>
                <label>
                  <span className="label">
                    Công ty <span className="text-ink-5">— không bắt buộc</span>
                  </span>
                  <input className="field" placeholder="Để trống nếu muốn hệ thống tự nhận" value={company} onChange={(e) => setCompany(e.target.value)} />
                </label>
              </div>
            )}
            {error && (
              <div role="alert" className="rounded-lg border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger-strong">
                {error}
                {tab === "url" && (
                  <button type="button" className="ml-2 underline" onClick={() => (setTab("paste"), setError(null))}>
                    Dán nội dung JD
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[13px] text-ink-3">{busy ? "Đang phân tích — thường dưới 30 giây." : "Thời gian phân tích dự kiến dưới 30 giây."}</span>
              <Button variant="primary" size="lg" disabled={!canSubmit} onClick={submit}>
                {busy && <Spinner />} Phân tích JD
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <aside className="mt-4 flex flex-col gap-4 md:mt-[6px]">
        <Card className="p-5">
          <Eyebrow>Mỗi JD chỉ đọc một lần</Eyebrow>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-3">
            Kết quả bóc tách được lưu lại. Mở lại JD cũ không tốn thêm lượt xử lý và cho ra đúng kết quả như lần đầu.
          </p>
        </Card>
        <Card className="p-5">
          <Eyebrow>Đang so với</Eyebrow>
          <div className="mt-3 flex flex-col gap-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span>Hồ sơ năng lực</span>
              <Link href="/profile" className="link text-[13px]">
                Xem
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <span>Kỳ vọng — {ws.preferences.dealBreakers.length} deal-breaker</span>
              <Link href="/preferences" className="link text-[13px]">
                Sửa
              </Link>
            </div>
          </div>
        </Card>
        {recent.length > 0 && (
          <Card className="p-5">
            <Eyebrow>JD gần đây</Eyebrow>
            <ul className="mt-3 flex flex-col divide-y divide-line-soft">
              {recent.map((j) => (
                <li key={j.id} className="py-2.5 first:pt-0">
                  <Link href={`/jobs/${j.id}`} className="block text-sm font-medium hover:text-accent">
                    {j.title}
                  </Link>
                  <div className="text-xs text-ink-4">
                    {[j.company, relativeDay(j.createdAt)].filter(Boolean).join(" · ")}
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/jobs" className="link mt-2 inline-block text-[13px]">
              Xem tất cả ({ws.jobs.length})
            </Link>
          </Card>
        )}
      </aside>
    </Page>
  );
}
