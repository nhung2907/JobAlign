"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { JobSchema, PreferencesSchema, ProfileSchema, type Job, type Preferences, type Profile } from "../schema";

export interface Workspace {
  profile: Profile | null;
  preferences: Preferences | null;
  jobs: Job[];
}

export interface Store {
  mode: "local" | "supabase";
  load(): Promise<Workspace>;
  saveProfile(p: Profile, cvPath?: string | null): Promise<void>;
  savePreferences(p: Preferences): Promise<void>;
  saveJob(j: Job): Promise<void>;
  deleteJob(id: string): Promise<void>;
  /** NFR-3 — xoá CV và toàn bộ dữ liệu phân tích. */
  deleteAll(): Promise<void>;
}

function safe<T>(schema: z.ZodType<T>, value: unknown): T | null {
  const r = schema.safeParse(value);
  return r.success ? r.data : null;
}

/* ---------------------------------------------------------------- Chế độ demo: trình duyệt */

const KEY = "jobalign:v1";

export class LocalStore implements Store {
  mode = "local" as const;

  private read(): { profile?: unknown; preferences?: unknown; jobs?: unknown[] } {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {
      return {};
    }
  }

  private write(patch: (d: ReturnType<LocalStore["read"]>) => void) {
    const d = this.read();
    patch(d);
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch {
      throw new Error("Trình duyệt không cho lưu dữ liệu (bộ nhớ đầy hoặc chế độ riêng tư).");
    }
  }

  async load(): Promise<Workspace> {
    const d = this.read();
    return {
      profile: d.profile ? safe(ProfileSchema, d.profile) : null,
      preferences: d.preferences ? safe(PreferencesSchema, d.preferences) : null,
      jobs: (d.jobs ?? []).map((j) => safe(JobSchema, j)).filter((j): j is Job => j !== null),
    };
  }

  async saveProfile(p: Profile) {
    this.write((d) => (d.profile = p));
  }

  async savePreferences(p: Preferences) {
    this.write((d) => (d.preferences = p));
  }

  async saveJob(j: Job) {
    this.write((d) => {
      const list = (d.jobs ?? []) as Job[];
      const i = list.findIndex((x) => x.id === j.id);
      if (i >= 0) list[i] = j;
      else list.push(j);
      d.jobs = list;
    });
  }

  async deleteJob(id: string) {
    this.write((d) => (d.jobs = ((d.jobs ?? []) as Job[]).filter((x) => x.id !== id)));
  }

  async deleteAll() {
    localStorage.removeItem(KEY);
  }
}

/* ---------------------------------------------------------------- Supabase */

export class SupabaseStore implements Store {
  mode = "supabase" as const;
  constructor(
    private sb: SupabaseClient,
    private userId: string,
  ) {}

  private check(error: { message: string } | null) {
    if (error) throw new Error(`Lưu dữ liệu thất bại: ${error.message}`);
  }

  async load(): Promise<Workspace> {
    const [p, pr, j] = await Promise.all([
      this.sb.from("profiles").select("data").eq("user_id", this.userId).maybeSingle(),
      this.sb.from("preferences").select("data").eq("user_id", this.userId).maybeSingle(),
      this.sb.from("jobs").select("data").eq("user_id", this.userId).order("created_at", { ascending: true }),
    ]);
    this.check(p.error ?? pr.error ?? j.error);
    return {
      profile: p.data ? safe(ProfileSchema, p.data.data) : null,
      preferences: pr.data ? safe(PreferencesSchema, pr.data.data) : null,
      jobs: (j.data ?? []).map((row) => safe(JobSchema, row.data)).filter((x): x is Job => x !== null),
    };
  }

  async saveProfile(p: Profile) {
    const { error } = await this.sb
      .from("profiles")
      .upsert({ user_id: this.userId, data: p, cv_path: p.cv?.path ?? null, updated_at: new Date().toISOString() });
    this.check(error);
  }

  async savePreferences(p: Preferences) {
    const { error } = await this.sb.from("preferences").upsert({ user_id: this.userId, data: p, updated_at: new Date().toISOString() });
    this.check(error);
  }

  async saveJob(j: Job) {
    const { error } = await this.sb.from("jobs").upsert({
      id: j.id,
      user_id: this.userId,
      source: j.source,
      url: j.url,
      title: j.title,
      company: j.company,
      content_hash: j.contentHash,
      data: j,
      created_at: j.createdAt,
      updated_at: new Date().toISOString(),
    });
    this.check(error);
  }

  async deleteJob(id: string) {
    const { error } = await this.sb.from("jobs").delete().eq("id", id).eq("user_id", this.userId);
    this.check(error);
  }

  async deleteAll() {
    const res = await fetch("/api/cv/file", { method: "DELETE" });
    if (!res.ok) throw new Error("Không xoá được tệp CV.");
    const results = await Promise.all([
      this.sb.from("jobs").delete().eq("user_id", this.userId),
      this.sb.from("preferences").delete().eq("user_id", this.userId),
      this.sb.from("profiles").delete().eq("user_id", this.userId),
    ]);
    for (const r of results) this.check(r.error);
  }
}
