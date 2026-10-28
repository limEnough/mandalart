'use client';

import type { User } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { avatarUrl, displayName } from '@/features/auth/useAuth';
import type { ThemeMode } from '@/shared/hooks/useThemeMode';
import { LogoutIcon, MoonIcon, PlusIcon, ShareIcon, SunIcon } from '@/shared/ui/icons';
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

  const boards = [...store.boards].sort((a, b) => b.updated - a.updated);
  const name = displayName(user);
  const avatar = avatarUrl(user);

  return (
    <nav className="bar" aria-label="도구">
      <div className="account" title={user.email ?? name}>
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- Google 프로필 사진
          <img src={avatar} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="avatar-fallback" aria-hidden="true">
            {name.slice(0, 1)}
          </span>
        )}
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
        이미지<span className="lbl"> 공유</span>
      </button>

      <select className="sel" aria-label="내 만다라트 목록" value={store.current} onChange={(e) => onSelect(e.target.value)}>
        {boards.map((b) => (
          <option key={b.id} value={b.id}>
            {boardLabel(b)}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn"
        onClick={onCreate}
        aria-disabled={!canCreate}
        title={canCreate ? '새로 만들기' : `${MAX_BOARDS}개까지 만들 수 있어요`}
      >
        <PlusIcon />
        <span className="lbl">새로 만들기</span>
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
