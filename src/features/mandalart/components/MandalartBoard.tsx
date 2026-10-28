'use client';

import { ExpandIcon } from '@/shared/ui/icons';
import { type Board, CENTER, SUB_NUMBER } from '../model';
import { BlockCells } from './BlockGrid';
import type { CellHandlers } from './Cell';

interface Props extends Omit<CellHandlers, 'onExpand'> {
  board: Board;
  /** false면 보기 전용(모바일): 칸을 한 번 탭하면 그 칸에 포커스된 채로 확대 편집이 열린다 */
  editable: boolean;
  /** c가 있으면 확대 보기에서 그 칸으로 바로 포커스 */
  onOpenBlock: (b: number, c?: number) => void;
}

export function MandalartBoard({ board, editable, onOpenBlock, ...handlers }: Props) {
  // 보기 전용 보드: 탭한 칸을 찾아 확대 보기로 넘긴다 (칸 밖 여백을 탭하면 블록만 연다)
  const handleTap = (b: number, target: EventTarget) => {
    const cell = (target as HTMLElement).closest<HTMLElement>('.cell');
    const c = cell?.dataset.c;
    onOpenBlock(b, c === undefined ? undefined : Number(c));
  };

  return (
    <main className={`board${editable ? '' : ' readonly'}`} data-cell-grid aria-label="만다라트 9×9 표">
      {Array.from({ length: 9 }, (_, b) => (
        <div key={b} className="block" data-b={b} onClick={editable ? undefined : (e) => handleTap(b, e.target)}>
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
