'use client';

import { useMemo, useRef, useState, type TouchEvent } from 'react';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { useToast } from '@/shared/ui/Toast';
import { ChevronLeftIcon, ChevronRightIcon, GoogleIcon } from '@/shared/ui/icons';
import { MandalartBoard } from '@/features/mandalart/components/MandalartBoard';
import { MAX_BOARDS, sampleBoard } from '@/features/mandalart/model';

interface Props {
  onGoogle: () => Promise<void>;
}

const noop = () => {};
const SLIDES = 3;

/** 처음 들어온 사람에게 보여주는 세 장짜리 안내. 마지막 장에서 Google 로그인하고, 이미 계정이 있는 사람은 상단 버튼으로 바로 로그인 */
export function Onboarding({ onGoogle }: Props) {
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const sample = useMemo(sampleBoard, []);
  const touchX = useRef<number | null>(null);

  const go = (n: number) => setI(Math.max(0, Math.min(SLIDES - 1, n)));

  const onTouchStart = (e: TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 48) go(i + (dx < 0 ? 1 : -1));
  };

  const login = async () => {
    setBusy(true);
    try {
      await onGoogle();
    } catch {
      setBusy(false);
      toast('로그인 창을 열지 못했어요. 잠시 후 다시 시도해 주세요');
    }
  };

  return (
    <div className="onb" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="onb-top">
        <p className="eyebrow">만다라트 · 목표 달성표</p>
        <button type="button" className="btn onb-login" onClick={login} disabled={busy} aria-label="Google로 로그인">
          <GoogleIcon />
          {busy ? '이동 중…' : '로그인'}
        </button>
      </div>
      <h1 className="onb-logo">MANDALART</h1>

      <div className="onb-track" style={{ transform: `translateX(-${i * 100}%)` }} aria-live="polite">
        <section className="onb-slide" aria-hidden={i !== 0}>
          <div className="onb-board" aria-hidden="true">
            <MandalartBoard board={sample} editable={false} onOpenBlock={noop} onChange={noop} onToggle={noop} onLimit={noop} />
          </div>
          <h2>목표 하나를 81칸으로 펼쳐요</h2>
          <p>
            가운데에 핵심 목표를 적으면, 그걸 이루기 위한 세부 목표 8개와 실천 항목 64개가 한 장에 정리됩니다. 오타니
            쇼헤이가 고등학생 때 썼던 바로 그 표예요.
          </p>
        </section>

        <section className="onb-slide" aria-hidden={i !== 1}>
          <ul className="onb-steps">
            <li>
              <b>1</b>
              <div>
                <strong>칸을 눌러 바로 적기</strong>
                <span>
                  <kbd>Enter</kbd>는 줄바꿈이에요. 가운데 블록의 세부 목표는 바깥 블록 가운데 칸으로 그대로 이어집니다.
                </span>
              </div>
            </li>
            <li>
              <b>2</b>
              <div>
                <strong>블록 크게 보기</strong>
                <span>
                  {isMobile ? (
                    '블록을 두 번 탭하면 크게 열려서 편하게 적을 수 있어요.'
                  ) : (
                    <>
                      <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Enter</kbd> 또는 블록 오른쪽 아래 버튼으로 한 블록만 크게 열어요.
                    </>
                  )}
                </span>
              </div>
            </li>
            <li>
              <b>3</b>
              <div>
                <strong>실천했으면 ○ 체크</strong>
                <span>실천 항목 칸의 동그라미를 누르면 완료로 표시되고, 위쪽 달성률이 올라갑니다.</span>
              </div>
            </li>
          </ul>
          <h2>쓰는 법은 이게 전부예요</h2>
        </section>

        <section className="onb-slide" aria-hidden={i !== 2}>
          <ul className="onb-steps">
            <li>
              <b>☁</b>
              <div>
                <strong>계정에 자동 저장</strong>
                <span>Google 계정으로 로그인하면 어느 기기에서나 이어서 쓸 수 있어요. 만다라트는 {MAX_BOARDS}개까지 만들 수 있습니다.</span>
              </div>
            </li>
            <li>
              <b>⇪</b>
              <div>
                <strong>이미지로 공유</strong>
                <span>핵심 목표와 세부 목표는 또렷하게, 실천 항목은 원하면 흐리게 가려서 PNG로 내보내고 공유합니다.</span>
              </div>
            </li>
          </ul>
          <h2>시작해 볼까요?</h2>
          <button type="button" className="btn google" onClick={login} disabled={busy}>
            <GoogleIcon />
            {busy ? '이동 중…' : 'Google로 계속하기'}
          </button>
          <p className="pnote">로그인은 한 번만 하면 돼요. 다음부터는 자동으로 들어와집니다.</p>
        </section>
      </div>

      <div className="onb-nav">
        <button type="button" className="btn icon-btn" onClick={() => go(i - 1)} disabled={i === 0} aria-label="이전">
          <ChevronLeftIcon />
        </button>
        <div className="onb-dots" role="tablist" aria-label="안내 단계">
          {Array.from({ length: SLIDES }, (_, k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={k === i}
              aria-label={`${k + 1}번째`}
              onClick={() => go(k)}
            />
          ))}
        </div>
        {i < SLIDES - 1 ? (
          <button type="button" className="btn solid" onClick={() => go(i + 1)}>
            다음
            <ChevronRightIcon />
          </button>
        ) : (
          <span className="icon-btn" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
