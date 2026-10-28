'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { CloseIcon } from './icons';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  wide?: boolean;
  /** false면 바깥 클릭·Esc로 닫히지 않는다 (확인이 꼭 필요한 안내용) */
  dismissible?: boolean;
  children: ReactNode;
}

export function Dialog({ open, onClose, titleId, wide, dismissible = true, children }: DialogProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !dismissible) return;
      // 셀 편집 중 Esc는 편집 종료가 먼저
      if ((document.activeElement as HTMLElement | null)?.dataset.cellInput) return;
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, dismissible]);

  if (!open) return null;
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div className={`panel${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        {children}
      </div>
    </div>
  );
}

export function DialogCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn icon-btn" onClick={onClick} aria-label="닫기">
      <CloseIcon />
    </button>
  );
}
