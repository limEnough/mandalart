'use client';

import { useEffect, useRef } from 'react';
import { Dialog, DialogCloseButton } from '@/shared/ui/Dialog';
import { ChevronLeftIcon, ChevronRightIcon } from '@/shared/ui/icons';
import { type Board, CENTER, FOCUS_ORDER, SUB_NUMBER, blockStat } from '../model';
import { BlockCells } from './BlockGrid';
import type { CellHandlers } from './Cell';

interface Props extends Omit<CellHandlers, 'onExpand'> {
  board: Board;
  block: number | null;
  autoFocus: boolean;
  onNavigate: (b: number) => void;
  onClose: () => void;
}

/** 블록 하나를 크게 열어 편집하는 창 */
export function FocusDialog({ board, block, autoFocus, onNavigate, onClose, ...handlers }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (block === null || !autoFocus) return;
    gridRef.current?.querySelector<HTMLElement>('[data-cell-input="edit"]')?.focus();
  }, [block, autoFocus]);

  if (block === null) return null;

  const step = (dir: 1 | -1) => {
    const i = FOCUS_ORDER.indexOf(block as (typeof FOCUS_ORDER)[number]);
    onNavigate(FOCUS_ORDER[(i + dir + FOCUS_ORDER.length) % FOCUS_ORDER.length]);
  };

  const title =
    block === CENTER
      ? '핵심 목표와 세부 목표'
      : `${SUB_NUMBER[block]}. ${board.cells[CENTER][block].trim() || '이름 없는 세부 목표'}`;
  const stat = block === CENTER ? null : blockStat(board, block);

  return (
    <Dialog open onClose={onClose} titleId="focus-title">
      <div className="phead">
        <button type="button" className="btn icon-btn" onClick={() => step(-1)} aria-label="이전 블록">
          <ChevronLeftIcon />
        </button>
        <h2 id="focus-title">{title}</h2>
        <button type="button" className="btn icon-btn" onClick={() => step(1)} aria-label="다음 블록">
          <ChevronRightIcon />
        </button>
        <DialogCloseButton onClick={onClose} />
      </div>
      <div ref={gridRef} className="fgrid" data-cell-grid>
        <BlockCells board={board} b={block} editable {...handlers} />
      </div>
      <p className="pnote">
        {stat
          ? `실천 항목 ${stat.filled}개 중 ${stat.done}개 완료 · 칸 오른쪽 위 ○ 로 완료를 표시하세요.`
          : '여기 적은 세부 목표 1~8은 같은 번호의 바깥 블록 가운데 칸에 그대로 이어집니다.'}
      </p>
    </Dialog>
  );
}
