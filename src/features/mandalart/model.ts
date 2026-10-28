/**
 * 만다라트 도메인 모델.
 *
 * 9×9 = 블록 9개 × 칸 9개. 블록/칸 인덱스는 모두 왼쪽 위부터 행 우선(0~8), 가운데가 4.
 *  - 중앙 블록(4)의 가운데 칸(4)       → 핵심 목표 (core)
 *  - 중앙 블록의 나머지 8칸             → 세부 목표 (sub)
 *  - 바깥 블록 b의 가운데 칸            → 세부 목표 b와 같은 데이터 (sub, 미러)
 *  - 바깥 블록의 나머지 칸              → 실천 항목 (act)
 */

export const MAXLEN = 40;
export const NOTEMAX = 120;
export const CENTER = 4;

/** 인당 만들 수 있는 만다라트 수 (DB 트리거와 같은 값, supabase/schema.sql) */
export const MAX_BOARDS = 2;

/** 예전 버전(서버 없음)의 localStorage 키. 첫 로그인 때 여기 있던 만다라트를 계정으로 옮긴다 */
export const LEGACY_STORE_KEY = 'mandalart-note.v1';
export const MODE_KEY = 'mandalart-note.mode';

export type CellKind = 'core' | 'sub' | 'act';

export interface Board {
  id: string;
  /** cells[block][cell]. 바깥 블록의 가운데 칸은 쓰지 않고 cells[4][block]을 참조한다 */
  cells: string[][];
  /** 81칸 완료 여부(0/1), 인덱스 = block * 9 + cell. 실천 항목만 의미가 있다 */
  done: number[];
  /** 올 한 해 나의 다짐 (부제목) */
  note: string;
  updated: number;
  sample?: boolean;
}

export interface Store {
  boards: Board[];
  current: string;
}

/** 세부 목표 번호: 왼쪽 위부터 시계 방향 1~8 */
export const SUB_NUMBER: Readonly<Record<number, number>> = { 0: 1, 1: 2, 2: 3, 5: 4, 8: 5, 7: 6, 6: 7, 3: 8 };
/** 확대 보기에서 이전/다음으로 넘길 순서 (중앙 → 1 → … → 8) */
export const FOCUS_ORDER = [4, 0, 1, 2, 5, 8, 7, 6, 3] as const;

/** DB 기본키로 쓰는 UUID v4 */
export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 3) | 8).toString(16);
      });
export const emptyCells = (): string[][] => Array.from({ length: 9 }, () => Array<string>(9).fill(''));
export const createBoard = (): Board => ({
  id: uid(),
  cells: emptyCells(),
  done: Array<number>(81).fill(0),
  note: '',
  updated: Date.now(),
});

/** 미러 칸을 실제 저장 위치로 바꾼다 */
export const resolve = (b: number, c: number): [number, number] =>
  b !== CENTER && c === CENTER ? [CENTER, b] : [b, c];

export const getCell = (board: Board, b: number, c: number) => {
  const [rb, rc] = resolve(b, c);
  return board.cells[rb][rc];
};

export const kindOf = (b: number, c: number): CellKind =>
  b === CENTER && c === CENTER ? 'core' : b === CENTER || c === CENTER ? 'sub' : 'act';

/** 세부 목표 칸이 가리키는 바깥 블록 번호 */
export const subIndex = (b: number, c: number) => (b === CENTER ? c : b);

export const isDone = (board: Board, b: number, c: number) =>
  kindOf(b, c) === 'act' && !!board.done[b * 9 + c] && !!board.cells[b][c].trim();

export type TextSize = 'm' | 's' | 'xs';
export const sizeOf = (v: string): TextSize => (v.length > 20 ? 'xs' : v.length > 11 ? 's' : 'm');

export const placeholderOf = (b: number, c: number) => {
  const k = kindOf(b, c);
  return k === 'core' ? '핵심 목표' : k === 'sub' ? '세부 목표' : '';
};

export const ariaLabelOf = (b: number, c: number) => {
  const k = kindOf(b, c);
  return k === 'core' ? '핵심 목표' : k === 'sub' ? `세부 목표 ${SUB_NUMBER[subIndex(b, c)]}` : '실천 항목';
};

export function blockStat(board: Board, s: number) {
  let filled = 0;
  let done = 0;
  for (let c = 0; c < 9; c++) {
    if (c === CENTER) continue;
    if (board.cells[s][c].trim()) {
      filled++;
      if (board.done[s * 9 + c]) done++;
    }
  }
  return { filled, done };
}

export function totals(board: Board) {
  let act = 0;
  let done = 0;
  let subs = 0;
  for (let s = 0; s < 9; s++) {
    if (s === CENTER) continue;
    const st = blockStat(board, s);
    act += st.filled;
    done += st.done;
    if (board.cells[CENTER][s].trim()) subs++;
  }
  return { act, done, subs, pct: act ? Math.round((done / act) * 100) : 0 };
}

export const boardLabel = (board: Board) => board.cells[CENTER][CENTER].trim() || '제목 없는 만다라트';

/** 저장소·공유 링크에서 읽은 값을 검증해 Board로 만든다. 형식이 틀리면 null */
export function sanitizeBoard(x: unknown): Board | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Partial<Board>;
  if (!Array.isArray(o.cells) || o.cells.length !== 9) return null;
  const cells = o.cells.map((row) =>
    Array.isArray(row) && row.length === 9 ? row.map((v) => String(v ?? '').slice(0, MAXLEN)) : null,
  );
  if (cells.some((r) => !r)) return null;
  const done = Array<number>(81).fill(0).map((_, i) => (Array.isArray(o.done) && o.done[i] ? 1 : 0));
  return {
    id: typeof o.id === 'string' && o.id ? o.id : uid(),
    cells: cells as string[][],
    done,
    note: String(o.note ?? '').slice(0, NOTEMAX),
    updated: typeof o.updated === 'number' ? o.updated : Date.now(),
    sample: !!o.sample,
  };
}

export function sampleBoard(): Board {
  const subs = ['체력', '수면', '식단', '마음', '', '커리어', '독서', '관계', '돈'];
  const acts: Record<number, string[]> = {
    0: ['주 3회 러닝 5km', '스쿼트 매일 50개', '계단 이용하기', '하프마라톤 완주', '스트레칭 10분', '체중 주간 기록', '등산 월 1회', '플랭크 2분'],
    1: ['자정 전 취침', '침대에서 폰 금지', '카페인은 오후 2시까지', '7시간 확보', '주말 늦잠 1시간 이내', '침실 온도 20도', '수면 기록', '아침 햇빛 10분'],
    2: ['아침 거르지 않기', '물 2L', '야식 주 1회 이하', '매 끼 채소 한 접시', '배달 주 2회 이하', '주말 장보기', '단백질 챙기기', '과일 하루 1개'],
    3: ['명상 10분', '일기 3줄', '감사한 일 기록', '일요일 디지털 디톡스', '혼자 산책', '취미 시간 확보', '남과 비교 줄이기', '휴가 미리 잡기'],
    5: ['기술 블로그 월 2회', '사이드 프로젝트 출시', '밋업 발표 1회', '오픈소스 기여', '영어 회화', '코드리뷰 꼼꼼히', '포트폴리오 정리', '새 기술 1개 깊게'],
    6: ['한 달 2권', '출퇴근 독서', '독서 모임', '서평 남기기', '분기마다 고전 1권', '전자책 활용', '책 선물하기', '도서관 월 1회'],
    7: ['부모님께 주 1회 전화', '친구 월 1회 만나기', '생일 챙기기', '먼저 연락하기', '끝까지 듣기', '칭찬 자주 하기', '가족 여행', '고마움 표현'],
    8: ['가계부 쓰기', '저축률 30%', '충동구매 24시간 룰', '비상금 만들기', '구독 정리', '투자 공부', '연말 기부', '통장 쪼개기'],
  };
  const b = createBoard();
  b.cells[CENTER] = subs.slice();
  b.cells[CENTER][CENTER] = '단단한 2027';
  for (const [k, list] of Object.entries(acts)) {
    const s = Number(k);
    let i = 0;
    for (let c = 0; c < 9; c++) if (c !== CENTER) b.cells[s][c] = list[i++];
  }
  const doneCells: [number, number][] = [
    [0, 0], [0, 6], [1, 0], [1, 3], [2, 1], [2, 6], [3, 1], [5, 0],
    [5, 6], [5, 7], [6, 1], [6, 6], [7, 0], [7, 2], [8, 0], [8, 5],
  ];
  for (const [s, c] of doneCells) b.done[s * 9 + c] = 1;
  b.note = '조급해하지 말고, 매일 조금씩 쌓아가기';
  b.sample = true;
  return b;
}
