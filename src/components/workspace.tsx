"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { evaluateJob, type JobEvaluation } from "@/lib/engine";
import { sampleJobs } from "@/lib/jobs";
import { samplePreferences, sampleProfile } from "@/lib/samples";
import type { Clarification, Job, Preferences, Profile } from "@/lib/schema";
import { LocalStore, SupabaseStore, type Store } from "@/lib/store/store";
import { browserSupabase } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

interface Health {
  gemini: boolean;
  model: string | null;
}

interface Toast {
  id: number;
  text: string;
  kind: "info" | "error";
}

interface WorkspaceCtx {
  ready: boolean;
  loadError: string | null;
  mode: "local" | "supabase";
  userEmail: string | null;
  health: Health | null;
  profile: Profile | null;
  preferences: Preferences | null;
  jobs: Job[];
  showUR: boolean;
  setShowUR(v: boolean): void;
  saveProfile(p: Profile): Promise<void>;
  savePreferences(p: Preferences): Promise<void>;
  saveJob(j: Job): Promise<void>;
  deleteJob(id: string): Promise<void>;
  deleteAll(): Promise<void>;
  loadSamples(): Promise<void>;
  answer(c: Clarification): Promise<void>;
  signOut(): Promise<void>;
  toast(text: string, kind?: Toast["kind"]): void;
}

const Ctx = createContext<WorkspaceCtx | null>(null);

/* Cờ "hiện mã URD" — tiện ích riêng của từng trình duyệt, đọc từ localStorage qua useSyncExternalStore. */
const UR_KEY = "jobalign:showUR";
const urListeners = new Set<() => void>();
function subscribeUR(fn: () => void) {
  urListeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    urListeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}
function readUR(): boolean {
  try {
    return localStorage.getItem(UR_KEY) === "1";
  } catch {
    return false;
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<Store | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const showUR = useSyncExternalStore(subscribeUR, readUR, () => false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, kind: Toast["kind"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 7000 : 3500);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let store: Store;
        const sb = browserSupabase();
        if (supabaseConfigured && sb) {
          const { data } = await sb.auth.getUser();
          if (!data.user) {
            if (!cancelled) setReady(true);
            return;
          }
          setUserEmail(data.user.email ?? null);
          store = new SupabaseStore(sb, data.user.id);
        } else {
          store = new LocalStore();
        }
        storeRef.current = store;
        const ws = await store.load();
        if (cancelled) return;
        setProfile(ws.profile);
        setPreferences(ws.preferences);
        setJobs(ws.jobs);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Không tải được dữ liệu.");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    fetch("/api/health")
      .then((r) => r.json())
      .then((h: Health) => !cancelled && setHealth(h))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setShowUR = useCallback((v: boolean) => {
    try {
      localStorage.setItem(UR_KEY, v ? "1" : "0");
    } catch {
      /* chế độ riêng tư: cờ không lưu được, bỏ qua */
    }
    urListeners.forEach((fn) => fn());
  }, []);

  const persist = useCallback(
    async (fn: (s: Store) => Promise<void>) => {
      const s = storeRef.current;
      if (!s) throw new Error("Chưa sẵn sàng lưu dữ liệu.");
      try {
        await fn(s);
      } catch (e) {
        toast(e instanceof Error ? e.message : "Lưu dữ liệu thất bại.", "error");
        throw e;
      }
    },
    [toast],
  );

  const saveProfile = useCallback(
    async (p: Profile) => {
      const next = { ...p, updatedAt: new Date().toISOString() };
      setProfile(next);
      await persist((s) => s.saveProfile(next));
    },
    [persist],
  );

  const savePreferences = useCallback(
    async (p: Preferences) => {
      const next = { ...p, updatedAt: new Date().toISOString() };
      setPreferences(next);
      await persist((s) => s.savePreferences(next));
    },
    [persist],
  );

  const saveJob = useCallback(
    async (j: Job) => {
      const next = { ...j, updatedAt: new Date().toISOString() };
      setJobs((list) => (list.some((x) => x.id === j.id) ? list.map((x) => (x.id === j.id ? next : x)) : [...list, next]));
      await persist((s) => s.saveJob(next));
    },
    [persist],
  );

  const deleteJob = useCallback(
    async (id: string) => {
      setJobs((list) => list.filter((x) => x.id !== id));
      await persist((s) => s.deleteJob(id));
    },
    [persist],
  );

  const deleteAll = useCallback(async () => {
    await persist((s) => s.deleteAll());
    setProfile(null);
    setPreferences(null);
    setJobs([]);
  }, [persist]);

  const loadSamples = useCallback(async () => {
    const now = new Date();
    const p = sampleProfile(now);
    const pr = samplePreferences(now);
    const existing = new Set(jobs.map((j) => j.contentHash));
    const add = sampleJobs(now).filter((j) => !existing.has(j.contentHash));
    setProfile(p);
    setPreferences(pr);
    setJobs((list) => [...list, ...add]);
    await persist(async (s) => {
      await s.saveProfile(p);
      await s.savePreferences(pr);
      for (const j of add) await s.saveJob(j);
    });
  }, [jobs, persist]);

  const answer = useCallback(
    async (c: Clarification) => {
      if (!profile) return;
      const next: Profile = {
        ...profile,
        clarifications: [...profile.clarifications.filter((x) => x.key !== c.key), c],
        updatedAt: new Date().toISOString(),
      };
      setProfile(next);
      await persist((s) => s.saveProfile(next));
    },
    [profile, persist],
  );

  const signOut = useCallback(async () => {
    const sb = browserSupabase();
    if (sb) await sb.auth.signOut();
    // Tải lại toàn trang để xoá sạch dữ liệu của phiên cũ khỏi bộ nhớ.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }, []);

  const value: WorkspaceCtx = {
    ready,
    loadError,
    mode: supabaseConfigured ? "supabase" : "local",
    userEmail,
    health,
    profile,
    preferences,
    jobs,
    showUR,
    setShowUR,
    saveProfile,
    savePreferences,
    saveJob,
    deleteJob,
    deleteAll,
    loadSamples,
    answer,
    signOut,
    toast,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-md border px-4 py-3 text-sm shadow-sm ${
              t.kind === "error" ? "border-danger bg-danger-soft text-danger-strong" : "border-line-strong bg-ink text-white"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useWorkspace(): WorkspaceCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWorkspace phải nằm trong WorkspaceProvider");
  return c;
}

/** Chấm mọi JD theo hồ sơ + kỳ vọng hiện tại. Kỳ vọng hay hồ sơ đổi → cả danh sách được chấm lại. */
export function useEvaluations(): Map<string, JobEvaluation> {
  const { profile, preferences, jobs } = useWorkspace();
  return useMemo(() => {
    const m = new Map<string, JobEvaluation>();
    if (!profile || !preferences) return m;
    for (const j of jobs) m.set(j.id, evaluateJob(profile, preferences, j));
    return m;
  }, [profile, preferences, jobs]);
}
