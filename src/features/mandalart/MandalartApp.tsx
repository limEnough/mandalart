'use client';

import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { supabase } from '@/lib/supabase';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { useThemeMode } from '@/shared/hooks/useThemeMode';
import { ToastProvider, useToast } from '@/shared/ui/Toast';
import { CloudIcon } from '@/shared/ui/icons';
import { FocusDialog } from './components/FocusDialog';
import { Header } from './components/Header';
import { ImageDialog } from './components/ImageDialog';
import { MandalartBoard } from './components/MandalartBoard';
import { Toolbar } from './components/Toolbar';
import { CENTER, MAX_BOARDS, MAXLEN, boardLabel } from './model';
import { useMandalartStore } from './store';

export default function MandalartApp() {
  return (
    <ToastProvider>
      <Gate />
    </ToastProvider>
  );
}

/** 로그인 상태에 따라 온보딩 ↔ 작업 화면을 고른다 */
function Gate() {
  const { state, signInWithGoogle, signOut } = useAuth();

  if (!supabase) return <SetupNotice />;
  if (state.status === 'loading') return <div className="wrap" aria-busy="true" />;
  if (state.status === 'out') return <Onboarding onGoogle={signInWithGoogle} />;
  return <Workspace user={state.user} onSignOut={signOut} />;
}

function SetupNotice() {
  return (
    <div className="wrap">
      <div className="notice">
        <span className="notice-icon">
          <CloudIcon />
        </span>
        <h2>Supabase 설정이 아직 없어요</h2>
        <ul>
          <li>
            프로젝트 루트에 <code>.env.local</code>을 만들고 <code>.env.local.example</code>의 두 값을 채워 주세요.
          </li>
          <li>
            Supabase SQL Editor에서 <code>supabase/schema.sql</code>을 실행하고, Authentication → Providers에서 Google을 켜
            주세요.
          </li>
          <li>개발 서버를 다시 시작하면 이 화면 대신 온보딩이 나옵니다.</li>
        </ul>
      </div>
    </div>
  );
}

function Workspace({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const { store, board, dispatch, saveStatus, migrated } = useMandalartStore(user.id);
  const [mode, setMode] = useThemeMode();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const toast = useToast();

  const [focusBlock, setFocusBlock] = useState<number | null>(null);
  const [imageOpen, setImageOpen] = useState(false);

  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    if (migrated) toast(`이 브라우저에 있던 만다라트 ${migrated}개를 계정으로 옮겼어요`);
  }, [migrated, toast]);

  useEffect(() => {
    if (saveStatus === 'limit') toast(`만다라트는 ${MAX_BOARDS}개까지만 저장할 수 있어요`);
  }, [saveStatus, toast]);

  /* 셀 핸들러는 memo된 Cell을 위해 안정적인 참조로 */
  const onChange = useCallback((b: number, c: number, value: string) => dispatch({ type: 'setCell', b, c, value }), [dispatch]);
  const onToggle = useCallback(
    (b: number, c: number) => {
      const cur = storeRef.current?.boards.find((x) => x.id === storeRef.current?.current);
      if (cur && !cur.cells[b][c].trim()) {
        toast('먼저 실천 항목을 적어 주세요');
        return;
      }
      dispatch({ type: 'toggleDone', b, c });
    },
    [dispatch, toast],
  );
  const onLimit = useCallback(() => toast(`한 칸에는 ${MAXLEN}자까지 적을 수 있어요`), [toast]);
  const openBlock = useCallback((b: number) => setFocusBlock(b), []);
  const closeFocus = useCallback(() => setFocusBlock(null), []);

  if (!store || !board) {
    return <div className="wrap" aria-busy="true" />;
  }

  const canCreate = store.boards.length < MAX_BOARDS;

  const handleCreate = () => {
    if (!canCreate) {
      toast(`만다라트는 ${MAX_BOARDS}개까지 만들 수 있어요. 하나를 지우고 다시 만들어 주세요`);
      return;
    }
    dispatch({ type: 'create' });
    toast('새 만다라트를 만들었어요');
    if (isMobile) setFocusBlock(CENTER);
    else
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('.block[data-b="4"] [data-kind="core"] [data-cell-input]')?.focus(),
      );
  };

  const handleRemove = () => {
    const name = boardLabel(board);
    dispatch({ type: 'remove' });
    toast(`'${name}'을(를) 삭제했어요`);
  };

  const handleShare = () => {
    if (!board.cells[CENTER][CENTER].trim()) {
      toast('공유하기 전에 핵심 목표를 적어 주세요');
      return;
    }
    setImageOpen(true);
  };

  const cellHandlers = { onChange, onToggle, onLimit };

  return (
    <div className="wrap">
      <Toolbar
        store={store}
        user={user}
        mode={mode}
        canCreate={canCreate}
        onSelect={(id) => dispatch({ type: 'select', id })}
        onCreate={handleCreate}
        onRemove={handleRemove}
        onToggleMode={() => setMode(mode === 'day' ? 'night' : 'day')}
        onOpenShare={handleShare}
        onSignOut={() => onSignOut().then(() => toast('로그아웃했어요'))}
      />

      <Header board={board} saveStatus={saveStatus} onNoteChange={(value) => dispatch({ type: 'setNote', value })} />

      <MandalartBoard board={board} editable={!isMobile} onOpenBlock={openBlock} {...cellHandlers} />

      <p className="hint">
        {isMobile ? (
          '블록을 두 번 탭하면 크게 열려서 편집할 수 있어요 · 칸 안에서 Enter는 줄바꿈'
        ) : (
          <>
            칸을 눌러 바로 입력 · <kbd>Enter</kbd> 줄바꿈 · 실천 칸의 ○ 로 완료 표시 · 블록 오른쪽 아래 버튼이나{' '}
            <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Enter</kbd>로 크게 보기
          </>
        )}
      </p>

      <FocusDialog
        board={board}
        block={focusBlock}
        autoFocus={!isMobile}
        onNavigate={setFocusBlock}
        onClose={closeFocus}
        {...cellHandlers}
      />
      <ImageDialog open={imageOpen} board={board} mode={mode} onModeChange={setMode} onClose={() => setImageOpen(false)} />
    </div>
  );
}
