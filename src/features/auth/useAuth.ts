'use client';

import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AuthState = { status: 'loading' } | { status: 'out' } | { status: 'in'; user: User };

/** Google 로그인 상태. 세션 복원·갱신은 supabase-js가 처리한다 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    if (!supabase) {
      setState({ status: 'out' });
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session?.user ? { status: 'in', user: session.user } : { status: 'out' });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(session?.user ? { status: 'in', user: session.user } : { status: 'out' });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  return { state, signInWithGoogle, signOut };
}

export const displayName = (u: User) =>
  (u.user_metadata?.full_name as string | undefined) || (u.user_metadata?.name as string | undefined) || u.email || '회원';
export const avatarUrl = (u: User) =>
  (u.user_metadata?.avatar_url as string | undefined) || (u.user_metadata?.picture as string | undefined) || '';
