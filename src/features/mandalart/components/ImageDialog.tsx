'use client';

import { useEffect, useRef, useState } from 'react';
import type { ThemeMode } from '@/shared/hooks/useThemeMode';
import { Dialog, DialogCloseButton } from '@/shared/ui/Dialog';
import { MoonIcon, SunIcon } from '@/shared/ui/icons';
import { useToast } from '@/shared/ui/Toast';
import { imageFileName, renderMandalartImage } from '../exportImage';
import { type Board, boardLabel } from '../model';

interface Props {
  open: boolean;
  board: Board;
  mode: ThemeMode;
  onModeChange: (m: ThemeMode) => void;
  onClose: () => void;
}

const toBlob = (cv: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));

/** 현재 테마 그대로 PNG를 그려 미리보기 → 공유(모바일)·다운로드·복사. 실천 항목은 토글로 흐리게 가릴 수 있다 */
export function ImageDialog({ open, board, mode, onModeChange, onClose }: Props) {
  const toast = useToast();
  const [showDone, setShowDone] = useState(true);
  const [blurActs, setBlurActs] = useState(false);
  const [preview, setPreview] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // data-mode가 바뀐 뒤 CSS 토큰이 반영된 상태에서 그리도록 한 프레임 미룬다
    const raf = requestAnimationFrame(async () => {
      const cv = await renderMandalartImage(board, { showDone, blurActs });
      if (cancelled) return;
      canvasRef.current = cv;
      setPreview(cv.toDataURL('image/png'));
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [open, board, mode, showDone, blurActs]);

  const file = async () => {
    const cv = canvasRef.current;
    if (!cv) throw new Error('no canvas');
    return new File([await toBlob(cv)], imageFileName(board, mode), { type: 'image/png' });
  };

  const share = async () => {
    try {
      const f = await file();
      if (!navigator.canShare({ files: [f] })) throw new Error('unsupported');
      await navigator.share({ files: [f], title: `만다라트 · ${boardLabel(board)}` });
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      toast('이 브라우저에서는 바로 공유할 수 없어요. 다운로드해서 보내 주세요');
    }
  };

  const download = async () => {
    try {
      const f = await file();
      const url = URL.createObjectURL(f);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast('이미지를 만들지 못했어요');
    }
  };

  const copy = async () => {
    const cv = canvasRef.current;
    if (!cv) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': toBlob(cv) })]);
      toast('이미지를 클립보드에 복사했어요');
    } catch {
      toast('이 브라우저에서는 이미지 복사가 막혀 있어요. 다운로드를 이용해 주세요');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} titleId="img-title" wide>
      <div className="phead">
        <h2 id="img-title">이미지로 공유</h2>
        <DialogCloseButton onClick={onClose} />
      </div>
      <div className="row">
        <div className="seg" role="group" aria-label="테마">
          <button type="button" aria-pressed={mode === 'day'} onClick={() => onModeChange('day')}>
            <SunIcon />낮
          </button>
          <button type="button" aria-pressed={mode === 'night'} onClick={() => onModeChange('night')}>
            <MoonIcon />밤
          </button>
        </div>
        <div className="seg" role="group" aria-label="완료 표시">
          <button type="button" aria-pressed={showDone} onClick={() => setShowDone(true)}>
            완료 표시
          </button>
          <button type="button" aria-pressed={!showDone} onClick={() => setShowDone(false)}>
            숨기기
          </button>
        </div>
        <label className="switch">
          <input type="checkbox" role="switch" checked={blurActs} onChange={(e) => setBlurActs(e.target.checked)} />
          <span className="track" aria-hidden="true" />
          실천 항목 가리기
        </label>
      </div>
      <div className="preview">
        {/* eslint-disable-next-line @next/next/no-img-element -- 캔버스 dataURL 미리보기 */}
        {preview ? <img src={preview} alt="만다라트 이미지 미리보기" /> : <span className="pnote">그리는 중…</span>}
      </div>
      <div className="row">
        {canNativeShare && (
          <button type="button" className="btn solid" onClick={share} disabled={!preview}>
            공유하기
          </button>
        )}
        <button type="button" className={`btn${canNativeShare ? '' : ' solid'}`} onClick={download} disabled={!preview}>
          PNG 다운로드
        </button>
        <button type="button" className="btn" onClick={copy} disabled={!preview}>
          이미지 복사
        </button>
      </div>
      <p className="pnote">
        핵심 목표와 세부 목표는 항상 보이고, 가리기를 켜면 실천 항목 64칸만 흐려집니다. 지금 보고 있는 낮/밤 테마 그대로 1500px
        너비로 저장돼요.
      </p>
    </Dialog>
  );
}
