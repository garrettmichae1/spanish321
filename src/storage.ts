import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  emptyState,
  StateSchema,
  type LearnerState,
  type Review,
  type Rating,
} from "./schema";
import { schedule } from "./learning";
export const native = isTauri();
let database: Promise<IDBDatabase> | undefined;
function db() {
  return (database ??= new Promise((resolve, reject) => {
    const r = indexedDB.open("spanish321", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("learner");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}
export async function loadState(): Promise<LearnerState> {
  if (native) {
    const value = await invoke<string | null>("load_state");
    return value ? StateSchema.parse(JSON.parse(value)) : emptyState();
  }
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = d.transaction("learner").objectStore("learner").get("state");
    r.onsuccess = () => {
      try {
        resolve(r.result ? StateSchema.parse(r.result) : emptyState());
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(r.error);
  });
}
export async function saveState(state: LearnerState) {
  StateSchema.parse(state);
  if (native) return invoke("save_state", { json: JSON.stringify(state) });
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = d.transaction("learner", "readwrite");
    tx.objectStore("learner").put(state, "state");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function nextReview(
  old: Review,
  rating: Rating,
  now: number,
): Promise<Review> {
  return native
    ? invoke("schedule_review", { old, rating, now })
    : schedule(old, rating, now);
}
export function download(
  name: string,
  body: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function openResource(url: string) {
  if (!/^https:\/\//.test(url))
    throw Error("Only HTTPS resources are allowed.");
  if (native) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else window.open(url, "_blank", "noopener,noreferrer");
}
