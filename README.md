# 만다라트 노트

핵심 목표 하나를 세부 목표 8개, 실천 항목 64개로 펼쳐 쓰는 만다라트 작성 앱.
Google 계정으로 로그인하면 Supabase DB에 자동 저장되고(인당 2개), 현재 테마 그대로 PNG로 내보내 공유한다.

## 실행

```bash
npm install
cp .env.local.example .env.local   # Supabase URL / anon key 채우기
npm run dev        # http://localhost:3000
npm run build && npm start
```

Node 20.9 이상(supabase-js는 22 이상을 권장). 서버 코드가 없는 클라이언트 전용 앱이라 `output: 'export'`로 정적 호스팅도 가능하다.

## Supabase 설정 (최초 1회)

1. https://supabase.com 에서 무료 프로젝트 생성 (Free 플랜: DB 500MB, 월 활성 사용자 5만 명).
2. **SQL Editor** 에서 `supabase/schema.sql` 실행 → `boards` 테이블, RLS 정책, 인당 2개 제한 트리거가 만들어진다.
3. **Authentication → Sign In / Providers → Auth Providers → Google** 켜기.
   - Google Cloud Console → API 및 서비스 → 사용자 인증 정보 → OAuth 클라이언트 ID(웹) 생성.
   - 승인된 리디렉션 URI에 Supabase가 알려주는 `https://<project>.supabase.co/auth/v1/callback` 추가.
   - 발급받은 Client ID / Secret을 Supabase Google 설정에 입력.
4. **Authentication → URL Configuration** 에 앱 주소를 등록한다.
   - Site URL: 배포 주소
   - Redirect URLs: `http://localhost:3000/**`, 배포 주소 `/**`
5. **Project Settings → API** 의 URL과 anon(publishable) key를 `.env.local`에 넣고 개발 서버 재시작.

환경변수가 없으면 앱은 온보딩 대신 설정 안내 화면을 띄운다.

## 기능

- 온보딩 3장: 만다라트 소개(예시 보드) → 쓰는 법 → 저장·공유 안내 + "Google로 계속하기". 이미 계정이 있으면 상단 로그인 버튼으로 바로 로그인
- Google 로그인, 세션은 브라우저에 보관되어 다음 방문부터 자동 로그인
- 9×9 만다라트 편집: 칸에서 바로 입력, `Enter`는 줄바꿈
- 세부 목표 1~8 자동 연동: 중앙 블록 칸 ↔ 같은 번호 바깥 블록의 가운데 칸
- 실천 항목 완료 체크, 블록별 진행 막대, 전체 달성률
- 블록 크게 보기: PC는 블록 오른쪽 아래 버튼 또는 `Ctrl/⌘+Enter`, 모바일은 블록을 두 번 탭
- 만다라트 인당 최대 2개 (클라이언트와 DB 트리거 양쪽에서 제한), 전환, 삭제(두 번 눌러 확인)
- 낮/밤 테마 (저장값 → 없으면 OS 설정)
- 이미지 공유: 현재 테마 토큰을 읽어 캔버스로 직접 그림 (1500px). 핵심·세부 목표는 항상 보이고, "실천 항목 가리기"를 켜면 64칸만 블러 처리. 모바일은 Web Share로 바로 보내기, PC는 PNG 다운로드·클립보드 복사
- 예전 버전(localStorage 저장)에 있던 만다라트는 첫 로그인 때 계정으로 자동 이전(최대 2개)

## 구조

```
app/
  layout.tsx            폰트 import, 테마 초기화 인라인 스크립트(깜빡임 방지)
  page.tsx
  globals.css           디자인 토큰(:root / [data-mode='night']) + 컴포넌트 스타일
src/
  lib/supabase.ts       브라우저용 Supabase 클라이언트 (env 없으면 null)
  features/auth/
    useAuth.ts          로그인 상태, Google OAuth, 로그아웃
  features/onboarding/
    Onboarding.tsx      세 장짜리 안내 슬라이드 (스와이프 지원)
  features/mandalart/
    model.ts            타입, 셀 좌표 규칙, 통계, 검증, 예시 데이터  ← 순수 함수
    repo.ts             boards 테이블 CRUD, 행 ↔ Board 변환
    store.ts            useReducer 상태 + DB 자동 저장(700ms 디바운스, 변경분만 upsert)
    exportImage.ts      PNG 캔버스 렌더러 (CSS 토큰을 읽어 테마 반영, 실천 항목 블러)
    MandalartApp.tsx    로그인 게이트 → 온보딩 / 작업 화면
    components/         Toolbar, Header, MandalartBoard, BlockGrid, Cell, FocusDialog, ImageDialog
  shared/
    hooks/              useMediaQuery, useThemeMode
    ui/                 Dialog, Toast, icons
supabase/
  schema.sql            테이블 · RLS · 2개 제한 트리거
```

### 메모

- **셀 좌표**: `cells[block][cell]`, 둘 다 0~8 행 우선. 바깥 블록의 가운데 칸은 저장하지 않고 `cells[4][block]`을 참조한다 (`model.resolve`).
- **Cell은 contentEditable**(`plaintext-only`)이다. 가운데 정렬과 자동 줄바꿈 때문에 textarea 대신 썼다. 입력 중 캐럿이 튀지 않도록 DOM은 비제어로 두고, 포커스가 없을 때만 `textContent`를 동기화한다. 한글 IME 조합 중에는 DOM 보정을 건너뛴다. Enter(Shift 포함)는 칸 안 줄바꿈이며 `\n`으로 저장되고 `.txt`의 `white-space: pre-wrap`과 PNG 렌더러의 `wrap`이 이를 그대로 살린다.
- **저장**: 상태가 바뀌면 700ms 뒤 마지막 저장본과 비교해 달라진 보드만 `upsert`, 목록에서 사라진 보드는 `delete`. 탭이 숨겨지면 즉시 저장하고, 다시 보일 때 저장할 변경이 없으면 DB를 다시 읽어 다른 기기에서 바꾼 내용을 반영한다(마지막 쓰기 우선).
- **권한**: RLS로 `auth.uid() = user_id` 행만 읽고 쓸 수 있다. 개수 제한은 UI에서도 막지만 최종 보루는 DB 트리거(`enforce_board_limit`).
- **테마 색의 단일 출처**는 `globals.css` 토큰이다. PNG 렌더러도 `getComputedStyle`로 같은 토큰을 읽기 때문에 색을 바꿀 때는 CSS만 고치면 된다.
- **블러**: 캔버스 `ctx.filter = 'blur(7px)'`로 글자를 그리고 칸 영역으로 클리핑한다. filter가 없는 옛 브라우저는 흐린 막대로 대체.
- **폰트**: Pretendard(dynamic subset), Federo, JetBrains Mono를 npm 패키지로 셀프 호스팅한다. PNG 렌더 전에 `document.fonts.load(font, text)`로 실제 쓰는 글자의 subset을 미리 받는다.
- **localStorage 키**: `mandalart-note.mode`(테마), `mandalart-note.v1`(예전 데이터, 이전 후 삭제), Supabase 세션(`sb-*-auth-token`).
