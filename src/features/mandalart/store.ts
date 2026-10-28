'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  type Board,
  type Store,
  LEGACY_STORE_KEY,
  MAX_BOARDS,
  createBoard,
  kindOf,
  resolve,
  sanitizeBoard,
  uid,
} from './model';
import { deleteBoards, isLimitError, listBoards, upsertBoards } from './repo';

export type Action =
  | { type: 'hydrate'; store: Store }
  | { type: 'setCell'; b: number; c: number; value: string }
  | { type: 'toggleDone'; b: number; c: number }
  | { type: 'setNote'; value: string }
  | { type: 'create' }
  | { type: 'remove' }
  | { type: 'select'; id: string };

const byRecent = (a: Board, b: Board) => b.updated - a.updated;

function updateCurrent(state: Store, fn: (b: Board) => Board): Store {
  return {
    ...state,
    boards: state.boards.map((bd) => (bd.id === state.current ? { ...fn(bd), updated: Date.now() } : bd)),
  };
}

export function reducer(state: Store | null, action: Action): Store | null {
  if (action.type === 'hydrate') return action.store;
  if (!state) return state;

  switch (action.type) {
    case 'setCell': {
      const [rb, rc] = resolve(action.b, action.c);
      return updateCurrent(state, (bd) => ({
        ...bd,
        cells: bd.cells.map((row, i) => (i === rb ? row.map((v, j) => (j === rc ? action.value : v)) : row)),
      }));
    }
    case 'toggleDone': {
      const { b, c } = action;
      const current = state.boards.find((x) => x.id === state.current);
      if (!current || kindOf(b, c) !== 'act' || !current.cells[b][c].trim()) return state;
      return updateCurrent(state, (bd) => ({
        ...bd,
        done: bd.done.map((v, i) => (i === b * 9 + c ? (v ? 0 : 1) : v)),
      }));
    }
    case 'setNote':
      return updateCurrent(state, (bd) => ({ ...bd, note: action.value }));
    case 'create': {
      if (state.boards.length >= MAX_BOARDS) return state;
      const nb = createBoard();
      return { boards: [...state.boards, nb], current: nb.id };
    }
    case 'remove': {
      const rest = state.boards.filter((b) => b.id !== state.current);
      const boards = rest.length ? rest : [createBoard()];
      return { boards, current: [...boards].sort(byRecent)[0].id };
    }
    case 'select':
      return state.boards.some((b) => b.id === action.id) ? { ...state, current: action.id } : state;
  }
}

/** 서버 없던 시절 localStorage에 남아 있던 만다라트. 예시·빈 보드는 제외 */
function readLegacyBoards(): Board[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LEGACY_STORE_KEY) ?? 'null') as { boards?: unknown[] } | null;
    if (!raw || !Array.isArray(raw.boards)) return [];
    return raw.boards
      .map(sanitizeBoard)
      .filter((b): b is Board => !!b && !b.sample && b.cells.some((row) => row.some((v) => v.trim())))
      .sort(byRecent)
      .map((b) => ({ ...b, id: uidLike(b.id) ? b.id : uid(), sample: false }));
  } catch {
    return [];
  }
}

const uidLike = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const serialize = (b: Board) => JSON.stringify([b.cells, b.done, b.note]);

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'limit';

/**
 * 만다라트 상태 + 계정 DB 자동 저장.
 * 변경 후 700ms 동안 추가 입력이 없으면, 마지막 저장본과 달라진 보드만 upsert 하고 사라진 보드는 delete 한다.
 * 탭이 숨겨질 때는 바로 저장하고, 다시 보일 때 저장할 것이 없으면 다른 기기에서 바꾼 내용을 다시 읽어 온다.
 */
export function useMandalartStore(userId: string) {
  const [store, dispatch] = useReducer(reducer, null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [migrated, setMigrated] = useState(0);
  const saved = useRef(new Map<string, string>());
  const storeRef = useRef<Store | null>(null);
  storeRef.current = store;
  const timer = useRef<number | undefined>(undefined);
  const inflight = useRef<Promise<void> | null>(null);

  const load = useCallback(async () => {
    let boards = await listBoards();
    saved.current = new Map(boards.map((b) => [b.id, serialize(b)]));
    if (!boards.length) {
      // 첫 로그인: 예전 브라우저 저장본이 있으면 옮기고, 없으면 빈 만다라트 하나로 시작
      const legacy = readLegacyBoards().slice(0, MAX_BOARDS);
      boards = legacy.length ? legacy : [createBoard()];
      if (legacy.length) setMigrated(legacy.length);
    }
    const current = storeRef.current?.current;
    dispatch({
      type: 'hydrate',
      store: { boards, current: boards.some((b) => b.id === current) ? current! : [...boards].sort(byRecent)[0].id },
    });
  }, []);

  useEffect(() => {
    load().catch(() => setSaveStatus('error'));
  }, [load, userId]);

  const flush = useCallback(() => {
    const s = storeRef.current;
    if (!s) return;
    if (inflight.current) {
      // 저장 중이면 끝난 뒤 한 번 더 비교해서 밀린 변경을 보낸다
      inflight.current.then(() => flushRef.current());
      return;
    }
    const changed = s.boards.filter((b) => saved.current.get(b.id) !== serialize(b));
    const ids = new Set(s.boards.map((b) => b.id));
    const removed = [...saved.current.keys()].filter((id) => !ids.has(id));
    if (!changed.length && !removed.length) return;
    setSaveStatus('saving');
    const snapshot = new Map(changed.map((b) => [b.id, serialize(b)]));
    inflight.current = (async () => {
      try {
        await deleteBoards(removed);
        removed.forEach((id) => saved.current.delete(id));
        await upsertBoards(userId, changed);
        snapshot.forEach((v, k) => saved.current.set(k, v));
        setSaveStatus('saved');
        try {
          localStorage.removeItem(LEGACY_STORE_KEY);
        } catch {
          /* 무시 */
        }
      } catch (e) {
        setSaveStatus(isLimitError(e) ? 'limit' : 'error');
      } finally {
        inflight.current = null;
      }
    })();
  }, [userId]);
  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => {
    if (!store) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 700);
    return () => window.clearTimeout(timer.current);
  }, [store, flush]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        window.clearTimeout(timer.current);
        flush();
        return;
      }
      const s = storeRef.current;
      const dirty = !s || inflight.current || s.boards.some((b) => saved.current.get(b.id) !== serialize(b));
      if (!dirty) load().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [flush, load]);

  const board = store ? (store.boards.find((b) => b.id === store.current) ?? store.boards[0]) : null;
  return { store, board, dispatch, saveStatus, migrated };
}
