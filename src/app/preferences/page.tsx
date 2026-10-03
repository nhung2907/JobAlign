"use client";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Page } from "@/components/app-shell";
import { IconPlus, IconX } from "@/components/icons";
import { Button, Card, Chip, cx, Eyebrow, Loading, PageTitle, Segmented, Spinner, UR } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import { defaultPreferences } from "@/lib/defaults";
import { dealBreakerLabel, GROWTH_LABEL, MODE_LABEL } from "@/lib/engine";
import type { DealBreaker, GrowthKey, Importance, Preferences, WorkMode } from "@/lib/schema";
import { CITIES } from "@/lib/taxonomy";
import { uid } from "@/lib/text";

const IMPORTANCE_OPTS: { value: Importance; label: string }[] = [
  { value: "must", label: "Must-have" },
  { value: "important", label: "Important" },
  { value: "nice", label: "Nice-to-have" },
];

function Block({ title, ur, importance, onImportance, children, danger }: { title: string; ur: string; importance?: Importance; onImportance?(v: Importance): void; children: ReactNode; danger?: boolean }) {
  return (
    <Card className={cx("px-5 py-5", danger && "border-l-[3px] border-l-danger")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <UR code={ur} />
        </div>
        {importance && onImportance && <Segmented value={importance} options={IMPORTANCE_OPTS} onChange={onImportance} ariaLabel={`Mức quan trọng của ${title}`} />}
      </div>
      {children}
    </Card>
  );
}

function numOrNull(v: string): number | null {
  const n = Number(v.replace(",", "."));
  return v.trim() === "" || !Number.isFinite(n) || n < 0 ? null : n;
}

function DealBreakerAdder({ onAdd, cities }: { onAdd(d: DealBreaker): void; cities: string[] }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<DealBreaker["kind"]>("salary_below");
  const [value, setValue] = useState("");
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 items-center gap-2 rounded-full border border-dashed border-ink-5 px-3.5 text-sm font-semibold text-ink-3 hover:bg-muted hover:text-ink">
        <IconPlus size={13} /> Thêm deal-breaker
      </button>
    );
  const valid = kind === "salary_below" ? numOrNull(value) !== null : kind === "keyword" ? value.trim().length > 1 : kind === "outside_city" ? cities.length > 0 : true;
  return (
    <div className="mt-2 flex w-full flex-col gap-3 rounded-md border border-line-soft bg-subtle p-4 sm:flex-row sm:items-end">
      <label className="flex-1">
        <span className="label">Điều kiện</span>
        <select className="field" value={kind} onChange={(e) => (setKind(e.target.value as DealBreaker["kind"]), setValue(""))}>
          <option value="salary_below">Lương dưới một mức</option>
          <option value="onsite_full">Bắt buộc onsite 5 ngày/tuần</option>
          <option value="outside_city">Làm việc ngoài thành phố đã chọn</option>
          <option value="keyword">JD có nhắc tới một cụm từ</option>
        </select>
      </label>
      {(kind === "salary_below" || kind === "keyword") && (
        <label className="flex-1">
          <span className="label">{kind === "salary_below" ? "Mức (triệu đồng / tháng)" : "Cụm từ (vd. làm ca đêm)"}</span>
          <input className="field" inputMode={kind === "salary_below" ? "decimal" : "text"} value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
      )}
      {kind === "outside_city" && cities.length === 0 && <p className="flex-1 text-[13px] text-ink-4">Chọn khu vực làm việc ở trên trước.</p>}
      <div className="flex gap-2">
        <Button variant="muted" onClick={() => setOpen(false)}>Huỷ</Button>
        <Button
          variant="primary"
          disabled={!valid}
          onClick={() => {
            onAdd({ id: uid("db"), kind, value: kind === "salary_below" ? numOrNull(value) : null, keyword: kind === "keyword" ? value.trim() : null });
            setOpen(false);
            setValue("");
          }}
        >
          Thêm
        </Button>
      </div>
    </div>
  );
}

export default function PreferencesPage() {
  const ws = useWorkspace();
  if (!ws.ready) return <Loading />;
  return <PreferencesEditor />;
}

function PreferencesEditor() {
  const ws = useWorkspace();
  const router = useRouter();
  const [p, setP] = useState<Preferences>(() => ws.preferences ?? defaultPreferences());
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const onboarding = !ws.preferences;

  const set = (fn: (x: Preferences) => Preferences) => {
    setP(fn);
    setDirty(true);
  };
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const districts = CITIES.filter((c) => p.location.cities.includes(c.id)).flatMap((c) => c.districts);
  const salaryError = p.salary.desired !== null && p.salary.minimum !== null && p.salary.minimum > p.salary.desired;

  const save = async () => {
    setSaving(true);
    try {
      await ws.savePreferences(p);
      setDirty(false);
      if (!ws.profile) router.push("/cv");
      else if (onboarding) router.push("/jobs/new");
      else ws.toast(ws.jobs.length ? `Đã lưu — ${ws.jobs.length} JD đã được chấm lại theo kỳ vọng mới.` : "Đã lưu kỳ vọng.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page className="md:grid md:grid-cols-[1fr_300px] md:items-start md:gap-7">
      <div className="flex flex-col gap-4">
        <PageTitle
          title="Kỳ vọng nghề nghiệp"
          ur="UR-1.2"
          sub="Đây là chiều thứ hai của đánh giá: công việc có đáp ứng tiêu chuẩn của bạn không. Mỗi tiêu chí gắn một mức quan trọng riêng."
        />

        <Block title="Mức thu nhập" ur="UR-1.2.1" importance={p.salary.importance} onImportance={(v) => set((x) => ({ ...x, salary: { ...x.salary, importance: v } }))}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="label">Mong muốn (triệu đồng / tháng)</span>
              <input className="field" inputMode="decimal" value={p.salary.desired ?? ""} onChange={(e) => set((x) => ({ ...x, salary: { ...x.salary, desired: numOrNull(e.target.value) } }))} />
            </label>
            <label>
              <span className="label">Tối thiểu chấp nhận được</span>
              <input className="field" inputMode="decimal" value={p.salary.minimum ?? ""} onChange={(e) => set((x) => ({ ...x, salary: { ...x.salary, minimum: numOrNull(e.target.value) } }))} />
            </label>
          </div>
          {salaryError && <p className="mt-2 text-[13px] text-danger-strong">Mức tối thiểu đang cao hơn mức mong muốn.</p>}
          <label className="mt-4 flex items-center gap-2.5 text-sm text-ink-2">
            <input type="checkbox" className="h-4 w-4 accent-accent" checked={p.salary.negotiable} onChange={(e) => set((x) => ({ ...x, salary: { ...x.salary, negotiable: e.target.checked } }))} />
            Chấp nhận thương lượng nếu các tiêu chí khác đều đạt
          </label>
        </Block>

        <Block title="Địa điểm & di chuyển" ur="UR-1.2.2" importance={p.location.importance} onImportance={(v) => set((x) => ({ ...x, location: { ...x.location, importance: v } }))}>
          <span className="label">Thành phố làm việc</span>
          <div className="flex flex-wrap gap-2">
            {CITIES.slice(0, 6).map((c) => (
              <Chip
                key={c.id}
                selected={p.location.cities.includes(c.id)}
                onClick={() =>
                  set((x) => {
                    const cities = toggle(x.location.cities, c.id);
                    const keep = CITIES.filter((k) => cities.includes(k.id)).flatMap((k) => k.districts);
                    return { ...x, location: { ...x.location, cities, districts: x.location.districts.filter((d) => keep.includes(d)) } };
                  })
                }
              >
                {c.name}
              </Chip>
            ))}
          </div>
          {districts.length > 0 && (
            <>
              <span className="label mt-4">Khu vực ưu tiên — để trống nếu quận nào cũng được</span>
              <div className="flex flex-wrap gap-2">
                {districts.map((d) => (
                  <Chip key={d} selected={p.location.districts.includes(d)} onClick={() => set((x) => ({ ...x, location: { ...x.location, districts: toggle(x.location.districts, d) } }))}>
                    {d}
                  </Chip>
                ))}
              </div>
            </>
          )}
          <span className="label mt-4">Thời gian đi lại tối đa</span>
          <Segmented
            size="md"
            value={String(p.location.maxCommute ?? "any")}
            onChange={(v) => set((x) => ({ ...x, location: { ...x.location, maxCommute: v === "any" ? null : (Number(v) as 15 | 30 | 45) } }))}
            options={[
              { value: "15", label: "15 phút" },
              { value: "30", label: "30 phút" },
              { value: "45", label: "45 phút" },
              { value: "any", label: "Bất kỳ" },
            ]}
          />
          <p className="mt-2 text-xs text-ink-4">Hệ thống chưa tính quãng đường thật; khu vực bạn chọn được dùng thay cho thời gian đi lại.</p>
        </Block>

        <Block title="Hình thức làm việc" ur="UR-1.2.3" importance={p.workMode.importance} onImportance={(v) => set((x) => ({ ...x, workMode: { ...x.workMode, importance: v } }))}>
          <div className="grid grid-cols-3 gap-2.5">
            {(["onsite", "hybrid", "remote"] as WorkMode[]).map((m) => {
              const on = p.workMode.modes.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set((x) => ({ ...x, workMode: { ...x.workMode, modes: toggle(x.workMode.modes, m) } }))}
                  className={cx("h-12 rounded-lg border text-[15px]", on ? "border-2 border-accent bg-accent-soft font-semibold text-accent-strong" : "border-line-strong/60 text-ink-3 hover:bg-subtle hover:text-ink")}
                >
                  {MODE_LABEL[m]}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-4">Chọn được nhiều hình thức.</p>
        </Block>

        <Block title="Cơ hội phát triển" ur="UR-1.2.4" importance={p.growth.importance} onImportance={(v) => set((x) => ({ ...x, growth: { ...x.growth, importance: v } }))}>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(GROWTH_LABEL) as GrowthKey[]).map((g) => (
              <Chip key={g} selected={p.growth.wants.includes(g)} onClick={() => set((x) => ({ ...x, growth: { ...x.growth, wants: toggle(x.growth.wants, g) } }))}>
                {GROWTH_LABEL[g]}
              </Chip>
            ))}
          </div>
        </Block>

        <Block title="Deal-breaker" ur="UR-1.2.6" danger>
          <p className="-mt-2 mb-4 text-sm text-ink-3">Điều kiện mà nếu không đáp ứng thì bạn không muốn ứng tuyển. JD vi phạm sẽ bị cảnh báo trước khi chấm điểm.</p>
          <div className="flex flex-wrap items-start gap-2">
            {p.dealBreakers.map((d) => (
              <span key={d.id} className="inline-flex h-8 items-center gap-2 rounded-full border border-danger/40 bg-danger-soft pl-3.5 text-sm font-semibold text-danger-strong">
                {dealBreakerLabel(d)}
                <button type="button" aria-label="Xoá" className="flex h-full items-center pr-3 pl-1" onClick={() => set((x) => ({ ...x, dealBreakers: x.dealBreakers.filter((k) => k.id !== d.id) }))}>
                  <IconX size={12} />
                </button>
              </span>
            ))}
            <DealBreakerAdder cities={p.location.cities} onAdd={(d) => set((x) => ({ ...x, dealBreakers: [...x.dealBreakers, d] }))} />
          </div>
        </Block>
      </div>

      <aside className="mt-4 flex flex-col gap-4 md:sticky md:top-[84px] md:mt-0">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <Eyebrow>Mức quan trọng</Eyebrow>
            <UR code="UR-1.2.5" />
          </div>
          <dl className="mt-3 flex flex-col gap-3.5 text-[13px] leading-relaxed">
            <div>
              <dt className="font-semibold text-ink">Must-have</dt>
              <dd className="text-ink-3">Không đạt thì điểm Work Fit bị kéo xuống mạnh.</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Important</dt>
              <dd className="text-ink-3">Ảnh hưởng vừa phải, vẫn cân nhắc được.</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Nice-to-have</dt>
              <dd className="text-ink-3">Chỉ là điểm cộng, không làm hỏng kết luận.</dd>
            </div>
          </dl>
        </Card>
        <Card className="p-5">
          <p className="text-sm leading-relaxed text-ink-3">Kỳ vọng lưu ở cấp tài khoản và áp dụng cho mọi JD. Sửa lại lúc nào cũng được, các JD đã phân tích sẽ được chấm lại.</p>
          <Button block size="lg" variant="primary" className="mt-4" disabled={saving || salaryError || (!dirty && !onboarding)} onClick={save}>
            {saving && <Spinner />} {onboarding ? "Lưu kỳ vọng & bắt đầu" : dirty ? "Lưu kỳ vọng" : "Đã lưu"}
          </Button>
        </Card>
      </aside>
    </Page>
  );
}
