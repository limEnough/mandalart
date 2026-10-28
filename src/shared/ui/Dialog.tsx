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

/* 열린 대화창 수. 0 → 1 이 될 때 바깥 페이지 스크롤을 잠그고, 마지막 창이 닫힐 때 푼다 */
let openCount = 0;
let savedScrollY = 0;

/**
 * 바깥 페이지 스크롤 잠금. overflow: hidden만으로는 iOS Safari가 뒤 페이지를 계속 스크롤하므로
 * body를 fixed로 고정하고, 닫을 때 원래 스크롤 위치로 되돌린다.
 */
function lockScroll() {
  if (openCount++ > 0) return;
  savedScrollY = window.scrollY;
  const s = document.body.style;
  s.position = 'fixed';
  s.top = `-${savedScrollY}px`;
  s.left = '0';
  s.right = '0';
  s.width = '100%';
  s.overflow = 'hidden';
}
function unlockScroll() {
  if (--openCount > 0) return;
  const s = document.body.style;
  s.position = '';
  s.top = '';
  s.left = '';
  s.right = '';
  s.width = '';
  s.overflow = '';
  window.scrollTo(0, savedScrollY);
}

export function Dialog({ open, onClose, titleId, wide, dismissible = true, children }: DialogProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !dismissible) return;
      // 셀 편집 중 Esc는 편집 종료가 먼저
      if ((document.activeElement as HTMLElement | null)?.dataset.cellInput) return;
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
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
