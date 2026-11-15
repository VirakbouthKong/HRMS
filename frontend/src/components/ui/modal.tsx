import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/useI18n';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  className,
}) => {
  const { t } = useI18n();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll & manage focus restore when modal is active
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      const previousActive = document.activeElement as HTMLElement | null;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      requestAnimationFrame(() => {
        if (panelRef.current && !panelRef.current.contains(document.activeElement)) {
          panelRef.current.focus();
        }
      });

      return () => {
        document.body.style.overflow = originalOverflow;
        if (previousActive && typeof previousActive.focus === 'function') {
          previousActive.focus();
        }
      };
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'w-full bg-white rounded-xl shadow-xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 focus:outline-none',
          maxWidthClasses[maxWidth] || 'max-w-md',
          className
        )}
      >
        {/* Modal Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-slate-900 tracking-tight">{title}</h2>
              {subtitle && <p className="text-[13px] text-slate-500 mt-1">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              type="button"
              aria-label={t('closeDialog')}
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none transition-colors cursor-pointer"
            >
              <X weight="bold" className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body with smooth native scrolling */}
        <div className="p-6 overflow-y-auto overscroll-contain flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'md',
  className,
}) => {
  const { t } = useI18n();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      const previousActive = document.activeElement as HTMLElement | null;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      requestAnimationFrame(() => {
        if (panelRef.current && !panelRef.current.contains(document.activeElement)) {
          panelRef.current.focus();
        }
      });

      return () => {
        document.body.style.overflow = originalOverflow;
        if (previousActive && typeof previousActive.focus === 'function') {
          previousActive.focus();
        }
      };
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      className="fixed inset-0 z-[100] flex justify-end bg-slate-950/40 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'w-full bg-white h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto overscroll-contain animate-in slide-in-from-right duration-200 border-l border-slate-200 focus:outline-none',
          widthClasses[width] || 'max-w-md',
          className
        )}
      >
        <div>
          {title && (
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 id={titleId} className="text-lg font-semibold text-slate-900 tracking-tight">{title}</h2>
                {subtitle && <p className="text-[13px] text-slate-500 mt-1">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                type="button"
                aria-label={t('closeDrawer')}
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none transition-colors cursor-pointer"
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
