import { useSyncExternalStore } from 'react';
import { configApi, PublicConfig } from '../api';

/**
 * Frontend settings served by the gateway at GET /api/public/config (config-repo/frontend.yml).
 * Loaded once at start-up; until then (or if it fails) the defaults below apply, which match
 * the values the app used before reading the config.
 */
export interface AppConfig {
  features: { photoUpload: boolean; payroll: boolean; reports: boolean };
  limits: { photoMaxBytes: number; photoTypes: string[]; passwordMinLength: number };
}

const DEFAULTS: AppConfig = {
  features: { photoUpload: true, payroll: true, reports: true },
  limits: { photoMaxBytes: 3 * 1024 * 1024, photoTypes: ['image/jpeg', 'image/png', 'image/webp'], passwordMinLength: 8 },
};

let current: AppConfig = DEFAULTS;
const listeners = new Set<() => void>();

const merge = (raw: PublicConfig | null | undefined): AppConfig => ({
  features: {
    photoUpload: raw?.features?.photoUpload ?? DEFAULTS.features.photoUpload,
    payroll: raw?.features?.payroll ?? DEFAULTS.features.payroll,
    reports: raw?.features?.reports ?? DEFAULTS.features.reports,
  },
  limits: {
    photoMaxBytes: Number(raw?.limits?.photoMaxBytes) || DEFAULTS.limits.photoMaxBytes,
    photoTypes: raw?.limits?.photoTypes
      ? String(raw.limits.photoTypes).split(',').map((s) => s.trim()).filter(Boolean)
      : DEFAULTS.limits.photoTypes,
    passwordMinLength: Number(raw?.limits?.passwordMinLength) || DEFAULTS.limits.passwordMinLength,
  },
});

/** (Re)load from the gateway. Safe to call any time; failures keep the last known settings. */
export const loadAppConfig = async (): Promise<AppConfig> => {
  try {
    current = merge(await configApi.getPublic());
    listeners.forEach((fn) => fn());
  } catch {
    // Gateway unreachable or config missing: keep defaults / last known values.
  }
  return current;
};

export const getAppConfig = () => current;

export function useAppConfig(): AppConfig {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => current
  );
}
