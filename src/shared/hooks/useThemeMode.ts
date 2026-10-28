'use client';

import { useCallback, useEffect, useState } from 'react';
import { MODE_KEY } from '@/features/mandalart/model';

export type ThemeMode = 'day' | 'night';

/**
 * 낮/밤 테마. 실제 값은 <html data-mode>에 있고,
 * 첫 페인트 전에 layout의 인라인 스크립트가 저장된 값(또는 OS 설정)으로 채운다.
 */
export function useThemeMode() {
  const [mode, setModeState] = useState<ThemeMode>('day');

  useEffect(() => {
    setModeState(document.documentElement.dataset.mode === 'night' ? 'night' : 'day');
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    document.documentElement.dataset.mode = m;
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* 저장 못 해도 이번 세션에는 적용된다 */
    }
  }, []);

  return [mode, setMode] as const;
}

/** layout <head>에 넣을 테마 초기화 스크립트 (깜빡임 방지) */
export const themeInitScript = `(function(){try{var m=localStorage.getItem('${MODE_KEY}');if(m!=='day'&&m!=='night')m=matchMedia('(prefers-color-scheme: dark)').matches?'night':'day';document.documentElement.dataset.mode=m}catch(e){document.documentElement.dataset.mode='day'}})()`;
