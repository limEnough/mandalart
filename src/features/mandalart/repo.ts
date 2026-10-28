import { supabase } from '@/lib/supabase';
import { type Board, sanitizeBoard } from './model';

/** boards 테이블 행 ↔ Board 변환과 CRUD. 호출자는 로그인된 상태여야 한다(RLS) */

interface Row {
  id: string;
  user_id: string;
  cells: unknown;
  done: string;
  note: string;
  updated_at: string;
}

const db = () => {
  if (!supabase) throw new Error('supabase not configured');
  return supabase;
};

const fromRow = (r: Row): Board | null =>
  sanitizeBoard({
    id: r.id,
    cells: r.cells,
    done: String(r.done).split('').map(Number),
    note: r.note,
    updated: Date.parse(r.updated_at) || Date.now(),
  });

const toRow = (userId: string, b: Board) => ({
  id: b.id,
  user_id: userId,
  cells: b.cells,
  done: b.done.map((v) => (v ? '1' : '0')).join(''),
  note: b.note,
  updated_at: new Date(b.updated).toISOString(),
});

export async function listBoards(): Promise<Board[]> {
  const { data, error } = await db().from('boards').select('id,user_id,cells,done,note,updated_at').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(fromRow).filter((b): b is Board => !!b);
}

export async function upsertBoards(userId: string, boards: Board[]) {
  if (!boards.length) return;
  const { error } = await db().from('boards').upsert(boards.map((b) => toRow(userId, b)), { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteBoards(ids: string[]) {
  if (!ids.length) return;
  const { error } = await db().from('boards').delete().in('id', ids);
  if (error) throw error;
}

export const isLimitError = (e: unknown) =>
  typeof e === 'object' && !!e && 'message' in e && /board limit/i.test(String((e as { message: unknown }).message));
