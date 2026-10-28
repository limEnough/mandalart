import { type Board, CENTER, SUB_NUMBER, blockStat, getCell, kindOf, subIndex, totals } from './model';

/**
 * 만다라트를 PNG용 캔버스로 그린다.
 * 색은 문서 루트의 CSS 토큰을 그대로 읽어서, 지금 화면의 낮/밤 테마가 그대로 이미지에 반영된다.
 */

export interface ExportOptions {
  showDone: boolean;
  /** 실천 항목 64칸의 글자를 흐리게 가린다. 핵심·세부 목표는 항상 또렷하게 */
  blurActs: boolean;
}

const BODY = '"Pretendard Variable","Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
const TITLE = '"Federo",Georgia,serif';
const MONO = '"JetBrains Mono",ui-monospace,monospace';

function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    paper: v('--paper'),
    surface: v('--surface'),
    ink: v('--ink'),
    text: v('--text'),
    muted: v('--muted'),
    line: v('--line'),
    tint: v('--tint'),
    core: v('--core'),
    coreFg: v('--core-fg'),
    done: v('--done'),
  };
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 사용자가 직접 넣은 줄바꿈(\n)은 그대로 살리고, 각 줄을 폭에 맞춰 다시 감싼다 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  return text.split('\n').flatMap((line) => (line.trim() ? wrapLine(ctx, line, maxW) : []));
}

/** 단어 단위로 줄바꿈하고, 한 단어가 너무 길면 글자 단위로 자른다 */
function wrapLine(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/(\s+)/)) {
    if (!word) continue;
    if (ctx.measureText(line + word).width <= maxW) {
      line += word;
      continue;
    }
    if (line.trim()) lines.push(line.trim());
    line = '';
    if (/^\s+$/.test(word)) continue;
    if (ctx.measureText(word).width <= maxW) {
      line = word;
      continue;
    }
    for (const ch of word) {
      if (line && ctx.measureText(line + ch).width > maxW) {
        lines.push(line);
        line = ch;
      } else line += ch;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

/** 칸 안에 들어갈 때까지 글자 크기를 줄여 가운데 정렬로 그린다 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  w: number,
  h: number,
  weight: number,
  maxSize: number,
  minSize: number,
) {
  let size = maxSize;
  let lines: string[] = [];
  let lh = 0;
  for (; size >= minSize; size--) {
    ctx.font = `${weight} ${size}px ${BODY}`;
    lh = size * 1.28;
    lines = wrap(ctx, text, w);
    if (lines.length * lh <= h) break;
  }
  if (size < minSize) {
    ctx.font = `${weight} ${minSize}px ${BODY}`;
    lh = minSize * 1.28;
    lines = wrap(ctx, text, w);
    const max = Math.max(1, Math.floor(h / lh));
    if (lines.length > max) {
      lines = lines.slice(0, max);
      lines[max - 1] = lines[max - 1].slice(0, -1) + '…';
    }
  }
  let y = cy - ((lines.length - 1) * lh) / 2;
  for (const l of lines) {
    ctx.fillText(l, cx, y);
    y += lh;
  }
}

/**
 * 실천 항목 칸을 흐리게: 칸 안으로 클리핑한 뒤 blur 필터로 글자를 그린다.
 * 필터를 지원하지 않는 옛 브라우저에서는 글자 대신 흐릿한 막대 두 줄을 그린다.
 */
function drawBlurredAct(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  C: number,
  inset: number,
  color: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, C, C);
  ctx.clip();
  // 옛 Safari에는 filter가 없어서 TS 타입과 달리 런타임에 확인한다
  if (typeof (ctx as { filter?: unknown }).filter === 'string') {
    ctx.filter = 'blur(7px)';
    ctx.globalAlpha = 0.9;
    fitText(ctx, text, x + C / 2, y + C / 2, C - inset * 2, C - inset * 2.6, 400, 21, 13);
  } else {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.18;
    const w = C - inset * 2.6;
    const h = 12;
    const lines = text.length > 11 ? 2 : 1;
    for (let i = 0; i < lines; i++) {
      const lw = w * (i === lines - 1 ? 0.55 : 0.85);
      rr(ctx, x + C / 2 - lw / 2, y + C / 2 - ((lines - 1) * 18) / 2 + i * 18 - h / 2, lw, h, 6);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Pretendard dynamic subset은 실제로 쓰는 글자의 조각만 받아오므로, 그릴 텍스트를 넘겨 미리 로드한다 */
async function ensureFonts(board: Board) {
  const text = board.cells.flat().join('') + board.note + '만다라트 목표 달성표 실천 완료 0123456789%';
  try {
    await Promise.all([
      document.fonts.load(`400 40px ${TITLE}`, 'MANDALART'),
      document.fonts.load(`400 20px ${BODY}`, text),
      document.fonts.load(`500 20px ${BODY}`, text),
      document.fonts.load(`700 20px ${BODY}`, text),
      document.fonts.load(`500 20px ${MONO}`, '0123456789%'),
    ]);
  } catch {
    /* 폰트 로드 실패 시 대체 폰트로 그린다 */
  }
}

export async function renderMandalartImage(board: Board, opts: ExportOptions): Promise<HTMLCanvasElement> {
  await ensureFonts(board);
  const P = readPalette();
  const W = 1500;
  const pad = 84;
  const G = W - pad * 2;
  const note = (board.note || '').trim();
  const t = totals(board);

  // 부제목(다짐) 줄 수에 따라 헤더 높이가 달라지므로 먼저 측정
  const noteFont = `400 34px ${BODY}`;
  const noteLH = 48;
  const noteW = opts.showDone ? G - 380 : G;
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = noteFont;
  let noteLines = note ? wrap(measure, note, noteW) : [];
  if (noteLines.length > 2) {
    noteLines = noteLines.slice(0, 2);
    noteLines[1] = noteLines[1].slice(0, -1) + '…';
  }
  const ruleY = noteLines.length ? 236 + (noteLines.length - 1) * noteLH + 42 : 222;
  const top = ruleY + 34;
  const H = top + G + 64;

  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = P.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'middle';

  const d = new Date();
  const ds = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

  // 헤더: 영문 제목 + 다짐 부제목 + 달성률
  ctx.textAlign = 'left';
  ctx.fillStyle = P.muted;
  ctx.font = `500 22px ${BODY}`;
  ctx.fillText('만다라트 · 목표 달성표  ·  ' + ds, pad, 82);
  ctx.fillStyle = P.ink;
  ctx.font = `400 108px ${TITLE}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '5px';
  ctx.fillText('MANDALART', pad - 4, 160);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillStyle = P.text;
  ctx.font = noteFont;
  noteLines.forEach((l, i) => ctx.fillText(l, pad, 236 + i * noteLH));
  if (opts.showDone) {
    ctx.textAlign = 'right';
    ctx.fillStyle = P.ink;
    ctx.font = `500 76px ${MONO}`;
    ctx.fillText(t.pct + '%', W - pad, ruleY - 92);
    ctx.fillStyle = P.muted;
    ctx.font = `400 22px ${BODY}`;
    ctx.fillText(`실천 ${t.done} / ${t.act} 완료`, W - pad, ruleY - 30);
  }
  ctx.fillStyle = P.ink;
  ctx.fillRect(pad, ruleY, G, 4);

  // 블록
  const gap = 30;
  const B = (G - gap * 2) / 3;
  const C = B / 3;
  for (let b = 0; b < 9; b++) {
    const bx = pad + (b % 3) * (B + gap);
    const by = top + Math.floor(b / 3) * (B + gap);
    ctx.fillStyle = P.surface;
    ctx.fillRect(bx, by, B, B);

    for (let c = 0; c < 9; c++) {
      const k = kindOf(b, c);
      const x = bx + (c % 3) * C;
      const y = by + Math.floor(c / 3) * C;
      const fill =
        k === 'core'
          ? P.core
          : k === 'sub'
            ? P.tint
            : opts.showDone && board.done[b * 9 + c] && board.cells[b][c].trim()
              ? P.done
              : null;
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, C, C);
      }
    }

    ctx.strokeStyle = P.line;
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(bx + C * i, by);
      ctx.lineTo(bx + C * i, by + B);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, by + C * i);
      ctx.lineTo(bx + B, by + C * i);
      ctx.stroke();
    }
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = b === CENTER ? 5 : 2.5;
    const o = ctx.lineWidth / 2;
    rr(ctx, bx + o, by + o, B - o * 2, B - o * 2, 4);
    ctx.stroke();

    for (let c = 0; c < 9; c++) {
      const k = kindOf(b, c);
      const v = getCell(board, b, c).trim();
      const x = bx + (c % 3) * C;
      const y = by + Math.floor(c / 3) * C;
      const inset = C * 0.12;

      if (k === 'sub') {
        ctx.textAlign = 'left';
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = P.ink;
        ctx.font = `500 16px ${MONO}`;
        ctx.fillText(String(SUB_NUMBER[subIndex(b, c)]), x + 12, y + 18);
        ctx.globalAlpha = 1;
      }
      if (!v) continue;

      ctx.textAlign = 'center';
      ctx.fillStyle = k === 'core' ? P.coreFg : k === 'sub' ? P.ink : P.text;
      if (k === 'core') fitText(ctx, v, x + C / 2, y + C / 2, C - inset * 2, C - inset * 2.2, 700, 30, 14);
      else if (k === 'sub') fitText(ctx, v, x + C / 2, y + C / 2, C - inset * 2, C - inset * 2.6, 700, 24, 13);
      else if (opts.blurActs) drawBlurredAct(ctx, v, x, y, C, inset, P.text);
      else fitText(ctx, v, x + C / 2, y + C / 2, C - inset * 2, C - inset * 2.6, 400, 21, 13);

      if (k === 'act' && opts.showDone && board.done[b * 9 + c]) {
        const cx = x + C - 20;
        const cy = y + 20;
        ctx.fillStyle = P.ink;
        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = P.surface;
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy + 0.5);
        ctx.lineTo(cx - 1.2, cy + 4.2);
        ctx.lineTo(cx + 5.5, cy - 4);
        ctx.stroke();
      }

      if (k === 'sub' && opts.showDone) {
        const st = blockStat(board, subIndex(b, c));
        if (st.filled) {
          const px = x + C * 0.16;
          const pw = C * 0.68;
          const py = y + C - C * 0.1;
          ctx.fillStyle = P.line;
          ctx.fillRect(px, py - 2, pw, 4);
          ctx.fillStyle = P.ink;
          ctx.fillRect(px, py - 2, (pw * st.done) / st.filled, 4);
        }
      }
    }
  }
  return cv;
}

export function imageFileName(board: Board, mode: string) {
  const name = (board.cells[CENTER][CENTER].trim() || 'untitled').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 30);
  return `mandalart-${name}-${mode}.png`;
}
