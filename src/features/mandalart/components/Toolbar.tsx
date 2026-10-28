'use client';

import type { User } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { avatarUrl, displayName } from '@/features/auth/useAuth';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import type { ThemeMode } from '@/shared/hooks/useThemeMode';
import { LogoutIcon, MoonIcon, MoreIcon, PlusIcon, ShareIcon, SunIcon } from '@/shared/ui/icons';
import { type Store, MAX_BOARDS, boardLabel } from '../model';

interface Props {
  store: Store;
  user: User;
  mode: ThemeMode;
  canCreate: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRemove: () => void;
  onToggleMode: () => void;
  onOpenShare: () => void;
  onSignOut: () => void;
}

export function Toolbar({ store, user, mode, canCreate, onSelect, onCreate, onRemove, onToggleMode, onOpenShare, onSignOut }: Props) {
  const isMobile = useMediaQuery('(max-width: 640px)');

  // 삭제는 3초 안에 한 번 더 눌러야 실행 (페이지 안에서 확인)
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleRemove = () => {
    if (!armed) {
      setArmed(true);
      timer.current = window.setTimeout(() => setArmed(false), 3000);
      return;
    }
    window.clearTimeout(timer.current);
    setArmed(false);
    onRemove();
  };

  // 모바일: 자주 안 쓰는 동작은 ⋯ 메뉴로 접는다. 바깥을 누르거나 Esc로 닫힘
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);
  const closeAnd = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  const boards = [...store.boards].sort((a, b) => b.updated - a.updated);
  const name = displayName(user);
  const avatar = avatarUrl(user);
  const avatarEl = avatar ? (
    // eslint-disable-next-line @next/next/no-img-element -- Google 프로필 사진
    <img src={avatar} alt="" referrerPolicy="no-referrer" />
  ) : (
    <span className="avatar-fallback" aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
  const boardSelect = (
    <select className="sel" aria-label="내 만다라트 목록" value={store.current} onChange={(e) => onSelect(e.target.value)}>
      {boards.map((b) => (
        <option key={b.id} value={b.id}>
          {boardLabel(b)}
        </option>
      ))}
    </select>
  );

  if (isMobile) {
    return (
      <nav className="bar mbar" aria-label="도구">
        <div className="account" title={user.email ?? name}>
          {avatarEl}
        </div>
        {boardSelect}
        <button type="button" className="btn icon-btn solid" onClick={onOpenShare} aria-label="이미지로 공유" title="이미지로 공유">
          <ShareIcon />
        </button>
        <div className="menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="btn icon-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="더 보기"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreIcon />
          </button>
          {menuOpen && (
            <div className="menu" role="menu">
              <button type="button" role="menuitem" onClick={closeAnd(onCreate)} aria-disabled={!canCreate}>
                <PlusIcon />
                새로 만들기
                <span className="count">
                  {store.boards.length}/{MAX_BOARDS}
                </span>
              </button>
              <button type="button" role="menuitem" onClick={closeAnd(onToggleMode)}>
                {mode === 'day' ? <MoonIcon /> : <SunIcon />}
                {mode === 'day' ? '밤 테마' : '낮 테마'}
              </button>
              <button
                type="button"
                role="menuitem"
                className={armed ? 'danger' : ''}
                onClick={armed ? closeAnd(handleRemove) : handleRemove}
              >
                {armed ? '한 번 더 누르면 삭제' : '이 만다라트 삭제'}
              </button>
              <hr />
              <button type="button" role="menuitem" onClick={closeAnd(onSignOut)}>
                <LogoutIcon />
                로그아웃
                <span className="count">{name}</span>
              </button>
            </div>
          )}
        </div>
      </nav>
    );
  }

  return (
    <nav className="bar" aria-label="도구">
      <div className="account" title={user.email ?? name}>
        {avatarEl}
        <span className="lbl">{name}</span>
        <button type="button" className="btn icon-btn" onClick={onSignOut} aria-label="로그아웃" title="로그아웃">
          <LogoutIcon />
        </button>
      </div>
      <span className="spacer" />
      <button
        type="button"
        className="btn icon-btn"
        onClick={onToggleMode}
        aria-label={mode === 'day' ? '밤 테마로 전환' : '낮 테마로 전환'}
        title={mode === 'day' ? '밤 테마' : '낮 테마'}
      >
        {mode === 'day' ? <MoonIcon /> : <SunIcon />}
      </button>
      <button type="button" className="btn solid" onClick={onOpenShare}>
        <ShareIcon />
        이미지 공유
      </button>

      {boardSelect}
      <button
        type="button"
        className="btn"
        onClick={onCreate}
        aria-disabled={!canCreate}
        title={canCreate ? '새로 만들기' : `${MAX_BOARDS}개까지 만들 수 있어요`}
      >
        <PlusIcon />
        새로 만들기
        <span className="count">
          {store.boards.length}/{MAX_BOARDS}
        </span>
      </button>
      <button type="button" className={`btn${armed ? ' danger' : ''}`} onClick={handleRemove}>
        {armed ? '한 번 더 누르면 삭제' : '삭제'}
      </button>
    </nav>
  );
}
