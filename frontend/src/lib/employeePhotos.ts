import { useEffect, useRef, useState } from 'react';
import { photoApi } from '../api';

/**
 * Session cache of employee photos as object URLs.
 * - Each employee is fetched at most once per session (null = no real photo, show initials).
 * - At most MAX_CONCURRENT requests run at a time.
 * - Components subscribe, so an invalidated photo (e.g. after an upload) re-renders everywhere.
 */
const MAX_CONCURRENT = 4;

const cache = new Map<number, string | null>(); // resolved: object URL, or null when only a default avatar exists
const inFlight = new Set<number>();
const queue: number[] = [];
const listeners = new Map<number, Set<() => void>>();
let running = 0;

const notify = (id: number) => listeners.get(id)?.forEach((fn) => fn());

const pump = () => {
  while (running < MAX_CONCURRENT && queue.length) {
    const id = queue.shift()!;
    running += 1;
    photoApi
      .getEmployeePhoto(id)
      .then(({ blob, isDefault }) => {
        cache.set(id, !isDefault && blob && blob.size > 0 ? URL.createObjectURL(blob) : null);
      })
      .catch(() => {
        // Network/permission problems: fall back to initials; don't retry this session.
        cache.set(id, null);
      })
      .finally(() => {
        running -= 1;
        inFlight.delete(id);
        notify(id);
        pump();
      });
  }
};

const request = (id: number) => {
  if (cache.has(id) || inFlight.has(id)) return;
  inFlight.add(id);
  queue.push(id);
  pump();
};

/** Drop one employee's cached photo (e.g. after the user uploads or removes their own) and reload it. */
export const invalidateEmployeePhoto = (id?: number) => {
  if (id == null) return;
  const url = cache.get(id);
  if (url) URL.revokeObjectURL(url);
  cache.delete(id);
  if (listeners.get(id)?.size) request(id);
  else notify(id);
};

/** Forget every photo (on sign-out, so the next user never sees cached images). */
export const clearEmployeePhotos = () => {
  cache.forEach((url) => url && URL.revokeObjectURL(url));
  cache.clear();
  queue.length = 0;
};

/**
 * Photo URL for an employee, or null to show initials. Loads only once the element is
 * near the viewport, so long tables don't fire hundreds of requests at once.
 */
export function useEmployeePhoto<T extends Element>(employeeId?: number | null) {
  const ref = useRef<T | null>(null);
  const [, force] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (employeeId == null) return;
    const fn = () => force((n) => n + 1);
    if (!listeners.has(employeeId)) listeners.set(employeeId, new Set());
    listeners.get(employeeId)!.add(fn);
    return () => {
      listeners.get(employeeId)?.delete(fn);
    };
  }, [employeeId]);

  useEffect(() => {
    if (employeeId == null || visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [employeeId, visible]);

  useEffect(() => {
    if (employeeId != null && visible) request(employeeId);
  }, [employeeId, visible]);

  const url = employeeId != null ? cache.get(employeeId) ?? null : null;
  return { ref, url };
}
