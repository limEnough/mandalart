'use client';

import { type Board, blockStat, getCell, isDone, kindOf, subIndex } from '../model';
import { Cell, type CellHandlers } from './Cell';

interface BlockCellsProps extends CellHandlers {
  board: Board;
  b: number;
  editable: boolean;
}

/** 블록 하나의 3×3 칸. 보드와 확대 보기가 같이 쓴다 */
export function BlockCells({ board, b, editable, ...handlers }: BlockCellsProps) {
  return (
    <>
      {Array.from({ length: 9 }, (_, c) => {
        const stat = kindOf(b, c) === 'sub' ? blockStat(board, subIndex(b, c)) : null;
        return (
          <Cell
            key={c}
            b={b}
            c={c}
            value={getCell(board, b, c)}
            done={isDone(board, b, c)}
            filled={stat?.filled}
            doneCount={stat?.done}
            editable={editable}
            {...handlers}
          />
        );
      })}
    </>
  );
}
