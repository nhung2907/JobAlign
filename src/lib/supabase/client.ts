"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from "./config";

let client: SupabaseClient | null = null;

export function browserSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
