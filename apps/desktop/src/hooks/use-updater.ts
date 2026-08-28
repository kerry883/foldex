import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Update } from "@tauri-apps/plugin-updater";

import { queryKeys } from "@/lib/query-keys";

const RELEASES_API = "https://api.github.com/repos/kerry883/foldex/releases";

export type UpdaterPhase =
  | "idle"
  | "checking"
  | "available"
  | "up-to-date"
  | "downloading"
  | "installed"
  | "error";

export type PendingUpdate = {
  version: string;
  date?: string;
  notes?: string;
};

export type ReleaseEntry = {
  tag: string;
  name: string;
  publishedAt: string | null;
  url: string;
  prerelease: boolean;
};

const message = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

/**
 * Tauri reports update dates as "2024-01-01 12:00:00.000 +00:00:00", which
 * Date cannot parse as-is, so fall back to the calendar day.
 */
export const formatUpdateDate = (raw?: string) => {
  if (!raw) return null;
  const parsed = new Date(raw.split(" ")[0]);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
};

// ─── Installed version ───
export const useAppVersion = () =>
  useQuery({
    queryKey: queryKeys.updates.version,
    staleTime: Infinity,
    queryFn: async () => {
      const { getVersion } = await import("@tauri-apps/api/app");
      return getVersion();
    },
  });

// ─── Published releases, newest first ───
export const useReleaseHistory = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.updates.releases,
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ReleaseEntry[]> => {
      const response = await fetch(`${RELEASES_API}?per_page=20`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!response.ok) {
        throw new Error(`GitHub responded with ${response.status}`);
      }
      const payload = (await response.json()) as Array<{
        tag_name: string;
        name: string | null;
        published_at: string | null;
        html_url: string;
        draft: boolean;
        prerelease: boolean;
      }>;
      return payload
        .filter((release) => !release.draft)
        .map((release) => ({
          tag: release.tag_name,
          name: release.name || release.tag_name,
          publishedAt: release.published_at,
          url: release.html_url,
          prerelease: release.prerelease,
        }));
    },
  });

export const openReleasePage = async (url: string) => {
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
};

/**
 * Resolves to the pending update without touching any UI state, for the
 * background check on launch.
 */
export const peekForUpdate = async (): Promise<PendingUpdate | null> => {
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const found = await check();
    if (!found) return null;
    const pending = {
      version: found.version,
      date: found.date,
      notes: found.body,
    };
    await found.close();
    return pending;
  } catch {
    return null;
  }
};

/**
 * Check and install state machine. The configured endpoint always resolves to
 * the newest release, so this only ever installs the latest version.
 */
export function useUpdater() {
  const [phase, setPhase] = useState<UpdaterPhase>("idle");
  const [update, setUpdate] = useState<PendingUpdate | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<Update | null>(null);

  const checkForUpdate = useCallback(async () => {
    setPhase("checking");
    setError(null);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const found = await check();

      // Release the handle from any earlier check so repeated checks don't
      // pile up resources in the Rust process.
      const previous = handleRef.current;
      handleRef.current = found;
      if (previous) await previous.close().catch(() => undefined);

      if (found) {
        setUpdate({
          version: found.version,
          date: found.date,
          notes: found.body,
        });
        setPhase("available");
      } else {
        setUpdate(null);
        setPhase("up-to-date");
      }
    } catch (cause) {
      setError(message(cause));
      setPhase("error");
    }
  }, []);

  const installUpdate = useCallback(async () => {
    const handle = handleRef.current;
    if (!handle) return;

    setPhase("downloading");
    setProgress(0);
    setError(null);

    let total = 0;
    let received = 0;

    try {
      await handle.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength ?? 0;
            break;
          case "Progress":
            received += event.data.chunkLength;
            if (total > 0) {
              setProgress(Math.min(100, Math.round((received / total) * 100)));
            }
            break;
          case "Finished":
            setProgress(100);
            break;
        }
      });
      setPhase("installed");
    } catch (cause) {
      setError(message(cause));
      setPhase("error");
    }
  }, []);

  const restart = useCallback(async () => {
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  }, []);

  return {
    phase,
    update,
    progress,
    error,
    checkForUpdate,
    installUpdate,
    restart,
  };
}
