import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 브라우저 전용 Supabase 클라이언트.
 * 세션은 supabase-js가 localStorage에 보관하고 토큰을 자동 갱신하므로, 한 번 로그인하면 다음 방문부터 자동 로그인된다.
 * 환경변수가 없으면 null → 앱은 설정 안내 화면을 보여준다.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
      })
    : null;
