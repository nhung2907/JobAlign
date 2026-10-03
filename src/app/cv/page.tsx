"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Page } from "@/components/app-shell";
import { IconCheckCircle, IconInfo, IconUpload } from "@/components/icons";
import { Button, Card, cx, Eyebrow, PageTitle, Spinner } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import { saveCvDraft, type CvDraft } from "@/lib/draft";

const EXTRACTS = ["Học vấn", "Kinh nghiệm làm việc", "Kỹ năng", "Dự án", "Chứng chỉ & ngoại ngữ", "Thành tích"];

type Phase = { kind: "idle" } | { kind: "uploading"; name: string } | { kind: "reading"; name: string } | { kind: "error"; message: string };

export default function UploadCvPage() {
  const ws = useWorkspace();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [drag, setDrag] = useState(false);

  async function upload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setPhase({ kind: "error", message: "Tệp lớn hơn 10 MB." });
      return;
    }
    setPhase({ kind: "uploading", name: file.name });
    const form = new FormData();
    form.append("file", file);
    const timer = setTimeout(() => setPhase({ kind: "reading", name: file.name }), 600);
    try {
      const res = await fetch("/api/cv/parse", { method: "POST", body: form, signal: AbortSignal.timeout(60_000) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không đọc được CV.");
      saveCvDraft(data as CvDraft);
      router.push("/profile?draft=1");
    } catch (e) {
      const timeout = e instanceof DOMException && e.name === "TimeoutError";
      setPhase({ kind: "error", message: timeout ? "Đọc CV quá thời gian." : e instanceof Error ? e.message : "Không đọc được CV." });
    } finally {
      clearTimeout(timer);
    }
  }

  const busy = phase.kind === "uploading" || phase.kind === "reading";

  return (
    <Page narrow className="md:grid md:grid-cols-[1fr_328px] md:items-start md:gap-8">
      <div className="flex flex-col gap-5">
        <PageTitle
          title={ws.profile ? "Tải CV khác" : "Tải CV để bắt đầu"}
          ur="UR-1.1.1"
          sub="CV chỉ được đọc một lần. Hồ sơ năng lực sinh ra từ đây được dùng lại cho mọi JD về sau, bạn không phải nhập lại thông tin."
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f && !busy) upload(f);
          }}
          className={cx(
            "flex min-h-[264px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            drag ? "border-accent bg-accent-soft" : "border-dash bg-surface",
          )}
        >
          {busy ? (
            <>
              <Spinner className="h-6 w-6 text-accent" />
              <div className="text-[15px] font-semibold">{phase.kind === "uploading" ? "Đang tải lên…" : "Đang đọc CV…"}</div>
              <div className="text-[13px] text-ink-4">{phase.name} · thường mất dưới 30 giây</div>
            </>
          ) : (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                <IconUpload size={26} />
              </span>
              <div className="text-[15px] font-semibold">Kéo thả CV vào đây</div>
              <div className="text-[13px] text-ink-4">PDF hoặc DOCX · tối đa 10 MB</div>
              <Button variant="primary" size="lg" className="mt-1" onClick={() => input.current?.click()}>
                Chọn tệp từ máy
              </Button>
              <a href="/samples/cv-mau.pdf" download className="link mt-1 text-xs">
                Chưa có CV trong máy? Tải CV mẫu để thử
              </a>
            </>
          )}
          <input
            ref={input}
            type="file"
            hidden
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </div>

        {phase.kind === "error" && (
          <div role="alert" className="rounded-lg border border-danger/25 bg-danger-soft px-5 py-4 text-sm leading-relaxed">
            <div className="font-semibold text-danger-strong">{phase.message}</div>
            <div className="mt-1 text-ink-3">
              {ws.profile ? "Hồ sơ đã lưu của bạn không bị ảnh hưởng. " : ""}Bạn có thể thử tệp khác, hoặc nhập hồ sơ thủ công.
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-[13px] text-ink-4" aria-hidden>
          <span className="h-px flex-1 bg-line" /> hoặc <span className="h-px flex-1 bg-line" />
        </div>

        <Card className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[15px] font-medium">Nhập hồ sơ thủ công</div>
            <div className="text-[13px] text-ink-3">Dành cho CV lạ định dạng, hoặc khi bước đọc CV báo lỗi.</div>
          </div>
          <Button size="lg" href="/profile?manual=1">
            Nhập tay
          </Button>
        </Card>
      </div>

      <aside className="mt-6 flex flex-col gap-4 md:mt-[6px]">
        <Card className="p-5">
          <Eyebrow>Hệ thống sẽ trích xuất</Eyebrow>
          <ul className="mt-3 flex flex-col gap-2.5 text-[15px]">
            {EXTRACTS.map((x) => (
              <li key={x} className="flex items-center gap-3">
                <IconCheckCircle size={18} className="text-success" />
                {x}
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-line-soft pt-4 text-[13px] text-ink-3">
            Thời gian xử lý dự kiến dưới 30 giây.
            {ws.health && !ws.health.gemini && <> Đang dùng bộ đọc quy tắc (chưa cấu hình Gemini) — hãy kiểm tra kỹ kết quả ở bước sau.</>}
          </div>
        </Card>
        <p className="flex gap-2 text-xs leading-relaxed text-ink-4">
          <IconInfo size={14} className="mt-0.5 shrink-0" />
          CV chứa dữ liệu cá nhân. Chỉ chủ tài khoản xem được, và xoá được bất cứ lúc nào ở menu tài khoản.
        </p>
      </aside>
    </Page>
  );
}
