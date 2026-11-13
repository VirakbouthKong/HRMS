import { useCallback } from 'react';
import { useHrmsStore } from '../store/useHrmsStore';
import {
  Language,
  TranslationKey,
  translations,
  formatTranslation,
  translateStatus,
  translateLeaveType,
  translateRoleInfo,
} from './translations';
import { UserRole } from '../types';

export const useI18n = () => {
  const language = useHrmsStore((s) => s.language);
  const setLanguage = useHrmsStore((s) => s.setLanguage);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      const str = translations[language][key] ?? translations.en[key] ?? key;
      return vars ? formatTranslation(str, vars) : str;
    },
    [language]
  );

  const tStatus = useCallback(
    (status?: string) => translateStatus(status, language),
    [language]
  );

  const tLeaveType = useCallback(
    (leaveType?: string) => translateLeaveType(leaveType, language),
    [language]
  );

  const tRole = useCallback(
    (role: UserRole) => translateRoleInfo(role, language),
    [language]
  );

  return {
    language,
    setLanguage,
    t,
    tStatus,
    tLeaveType,
    tRole,
    isKhmer: language === 'kh',
  };
};

export type { Language, TranslationKey };
