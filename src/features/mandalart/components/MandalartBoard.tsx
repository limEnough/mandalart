'use client';

import { useRef } from 'react';
import { ExpandIcon } from '@/shared/ui/icons';
import { type Board, CENTER, SUB_NUMBER } from '../model';
import { BlockCells } from './BlockGrid';
import type { CellHandlers } from './Cell';

interface Props extends Omit<CellHandlers, 'onExpand'> {
  board: Board;
  /** false면 보기 전용(모바일): 블록을 두 번 탭하면 확대 편집이 열린다 */
  editable: boolean;
  onOpenBlock: (b: number) => void;
}

const DOUBLE_TAP_MS = 350;

export function MandalartBoard({ board, editable, onOpenBlock, ...handlers }: Props) {
  // iOS Safari는 dblclick을 믿을 수 없어서 탭 간격으로 직접 판단한다
  const lastTap = useRef<{ b: number; t: number } | null>(null);
  const handleTap = (b: number) => {
    const now = Date.now();
    const prev = lastTap.current;
    if (prev && prev.b === b && now - prev.t < DOUBLE_TAP_MS) {
      lastTap.current = null;
      onOpenBlock(b);
      return;
    }
    lastTap.current = { b, t: now };
  };

  return (
    <main className={`board${editable ? '' : ' readonly'}`} data-cell-grid aria-label="만다라트 9×9 표">
      {Array.from({ length: 9 }, (_, b) => (
        <div key={b} className="block" data-b={b} onClick={editable ? undefined : () => handleTap(b)}>
          <BlockCells board={board} b={b} editable={editable} onExpand={onOpenBlock} {...handlers} />
          {editable && (
            <button
              type="button"
              className="expand"
              title="크게 보기"
              aria-label={b === CENTER ? '핵심 블록 크게 보기' : `세부 목표 ${SUB_NUMBER[b]} 블록 크게 보기`}
              onClick={() => onOpenBlock(b)}
            >
              <ExpandIcon />
            </button>
          )}
        </div>
      ))}
    </main>
  );
}
