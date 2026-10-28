'use client';

import { memo, useLayoutEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { CheckIcon } from '@/shared/ui/icons';
import { MAXLEN, SUB_NUMBER, ariaLabelOf, kindOf, placeholderOf, sizeOf, subIndex } from '../model';

export interface CellHandlers {
  onChange: (b: number, c: number, value: string) => void;
  onToggle: (b: number, c: number) => void;
  onLimit: () => void;
  /** Enter → 줄바꿈, Ctrl/⌘ + Enter → 블록 크게 보기 (보드에서만). 같은 칸에 포커스가 이어지도록 c도 넘긴다 */
  onExpand?: (b: number, c: number) => void;
}

interface CellProps extends CellHandlers {
  b: number;
  c: number;
  value: string;
  done: boolean;
  /** 세부 목표 칸: 해당 블록의 실천 항목 진행 상황 */
  filled?: number;
  doneCount?: number;
  editable: boolean;
}

/** 줄바꿈은 유지하되, 줄 앞뒤 공백과 연속 줄바꿈은 정리한다 */
const normalizeText = (s: string) => s.replace(/\r/g, '').replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{2,}/g, '\n');

const placeCaretEnd = (el: HTMLElement) => {
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  const s = window.getSelection();
  s?.removeAllRanges();
  s?.addRange(r);
};

/**
 * 칸 하나. 가운데 정렬·자동 줄바꿈을 위해 textarea 대신 contentEditable을 쓰고,
 * 입력 중 캐럿이 튀지 않도록 DOM은 비제어(uncontrolled)로 두고 포커스가 없을 때만 값을 동기화한다.
 */
export const Cell = memo(function Cell({
  b, c, value, done, filled = 0, doneCount = 0, editable, onChange, onToggle, onLimit, onExpand,
}: CellProps) {
  const ref = useRef<HTMLDivElement>(null);
  const kind = kindOf(b, c);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.textContent !== value) el.textContent = value;
  }, [value]);

  const handleInput = (e: FormEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const composing = (e.nativeEvent as InputEvent).isComposing;
    let v = normalizeText(el.innerText);
    if (!composing) {
      if (!v.trim() && el.innerHTML !== '') {
        el.innerHTML = '';
        v = '';
      }
      if (v.length > MAXLEN) {
        v = v.slice(0, MAXLEN);
        el.textContent = v;
        placeCaretEnd(el);
        onLimit();
      }
    }
    onChange(b, c, v);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onExpand) {
      e.preventDefault();
      onExpand(b, c);
      return;
    }
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      // Enter(Shift 포함) → 칸 안에서 줄바꿈. 브라우저마다 Enter 처리가 달라 직접 넣는다
      e.preventDefault();
      if (e.currentTarget.innerText.length < MAXLEN) document.execCommand('insertLineBreak');
    } else if (e.key === 'Escape') {
      e.currentTarget.blur();
    }
  };

  const className = ['cell', c % 3 !== 2 && 'r', c < 6 && 'bt', done && 'done', kind === 'act' && value.trim() && 'filled']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} data-kind={kind} data-c={c}>
      <div
        ref={ref}
        className="txt"
        role="textbox"
        aria-label={ariaLabelOf(b, c)}
        data-ph={placeholderOf(b, c)}
        data-size={sizeOf(value)}
        data-cell-input={editable ? 'edit' : 'view'}
        contentEditable={editable ? 'plaintext-only' : false}
        suppressContentEditableWarning
        spellCheck={false}
        onInput={editable ? handleInput : undefined}
        onKeyDown={editable ? handleKeyDown : undefined}
        onPaste={
          editable
            ? (e) => {
                e.preventDefault();
                const t = normalizeText(e.clipboardData.getData('text/plain') || '');
                document.execCommand('insertText', false, t);
              }
            : undefined
        }
        onBlur={
          editable
            ? (e) => {
                const t = value.trim();
                if (t !== value) {
                  e.currentTarget.textContent = t;
                  onChange(b, c, t);
                }
              }
            : undefined
        }
      />
      {kind === 'sub' && (
        <>
          <span className="num" aria-hidden="true">
            {SUB_NUMBER[subIndex(b, c)]}
          </span>
          <div className="prog" data-empty={filled ? undefined : ''} title={`${doneCount}/${filled} 완료`}>
            <i style={{ width: filled ? `${(doneCount / filled) * 100}%` : 0 }} />
          </div>
        </>
      )}
      {kind === 'act' && (
        <button
          type="button"
          className="chk"
          aria-label="완료 표시"
          aria-pressed={done}
          tabIndex={editable ? 0 : -1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(b, c);
          }}
        >
          <CheckIcon />
        </button>
      )}
    </div>
  );
});
