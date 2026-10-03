import type { Preferences, Profile } from "./schema";

export function emptyProfile(now = new Date()): Profile {
  return {
    basics: { name: "", email: "", phone: "" },
    education: [],
    experience: [],
    skills: [],
    projects: [],
    certifications: [],
    achievements: [],
    clarifications: [],
    cv: null,
    updatedAt: now.toISOString(),
  };
}

export function defaultPreferences(now = new Date()): Preferences {
  return {
    salary: { desired: null, minimum: null, negotiable: false, importance: "must" },
    location: { cities: [], districts: [], maxCommute: null, importance: "important" },
    workMode: { modes: [], importance: "important" },
    growth: { wants: [], importance: "nice" },
    dealBreakers: [],
    updatedAt: now.toISOString(),
  };
}
