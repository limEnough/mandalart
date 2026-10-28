'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { type Board, NOTEMAX, totals } from '../model';
import type { SaveStatus } from '../store';

interface Props {
  board: Board;
  saveStatus: SaveStatus;
  onNoteChange: (value: string) => void;
}

const SAVE_LABEL: Record<SaveStatus, string> = {
  idle: '계정에 자동 저장',
  saving: '저장 중…',
  saved: '계정에 저장됨',
  error: '저장 안 됨: 연결을 확인해 주세요',
  limit: '저장 안 됨: 개수 제한',
};

export function Header({ board, saveStatus, onNoteChange }: Props) {
  const t = totals(board);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const fitNote = useCallback(() => {
    const el = noteRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(fitNote, [board.note, fitNote]);
  useEffect(() => {
    window.addEventListener('resize', fitNote);
    return () => window.removeEventListener('resize', fitNote);
  }, [fitNote]);

  return (
    <header className="head">
      <div className="ttl">
        <p className="eyebrow">
          만다라트 · 목표 달성표 {board.sample && <span className="chip">예시</span>}
        </p>
        <h1>MANDALART</h1>
        <textarea
          ref={noteRef}
          className="subtitle"
          rows={1}
          maxLength={NOTEMAX}
          aria-label="올 한 해 나의 다짐"
          placeholder="올 한 해 나의 다짐을 적어 보세요"
          value={board.note}
          // Enter는 칸과 똑같이 줄바꿈(textarea 기본 동작). 연속 줄바꿈만 하나로 접는다
          onChange={(e) => onNoteChange(e.target.value.replace(/\r/g, '').replace(/\n{2,}/g, '\n').slice(0, NOTEMAX))}
        />
      </div>
      <div className="rate">
        <ul>
          <li>
            실천 <b>{t.done}</b>/<b>{t.act}</b> 완료
          </li>
          <li>
            세부 목표 <b>{t.subs}</b>/8 · <span>{SAVE_LABEL[saveStatus]}</span>
          </li>
        </ul>
        <div className="pct" aria-label={`달성률 ${t.pct}%`}>
          {t.pct}
          <small>%</small>
        </div>
      </div>
    </header>
  );
}
