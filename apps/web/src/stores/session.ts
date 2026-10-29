"use client";

import { useEffect, useSyncExternalStore } from "react";
import { auth } from "@/lib/api-client";
import type { User } from "@/types";

/** Who is signed in, shared by every component. The session itself is an HttpOnly cookie the page can't read. */
export interface SessionState {
  status: "loading" | "ready";
  user: User | null;
}

const LOADING: SessionState = { status: "loading", user: null };
let state: SessionState = LOADING;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: SessionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function setUser(user: User | null) {
  publish({ status: "ready", user });
}

export function loadSession(force = false): Promise<void> {
  if (!pending || force) {
    pending = auth
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null));
  }
  return pending;
}

export async function signOut(): Promise<void> {
  try {
    await auth.logout();
  } finally {
    setUser(null);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSession(): SessionState {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => LOADING);
  useEffect(() => {
    void loadSession();
  }, []);
  return snapshot;
}

export function initials(user: Pick<User, "name" | "email">): string {
  const words = (user.name || user.email).split(/[\s@._-]+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}
