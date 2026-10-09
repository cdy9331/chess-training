# 체스 학습 웹 앱 — 구현 계획 (PLAN.md)

> 초보자(행마법·기초 전략 수준)가 chess.com처럼 **대국 → 복기 → 약점 훈련**의 순환으로 실력을 올릴 수 있는 브라우저 전용 학습 도구.
> 서버 없음. 모든 계산(Stockfish)과 저장(IndexedDB)은 브라우저에서 처리한다.

---

## 0. 핵심 설계 원칙

1. **학습 루프 중심**: 기능을 따로따로 두지 않고 "AI와 대국 → 게임 리뷰 → 내 실수로 만든 퍼즐/관련 레슨 추천"으로 연결한다.
2. **검증된 라이브러리만 사용**: 규칙은 chess.js, 보드는 react-chessboard, 엔진은 Stockfish WASM. 체스 로직/AI를 직접 구현하지 않는다.
3. **순수 로직과 UI 분리**: `src/core/`는 React·DOM에 의존하지 않는 순수 TypeScript로 작성해 단위 테스트한다.
4. **단계마다 실행 가능**: 각 Phase는 `npm run dev`로 띄워 눈으로 확인할 수 있는 결과물로 끝난다.
5. **정적 배포 가능**: 빌드 결과물(`dist/`)만으로 GitHub Pages/Netlify 등에 올릴 수 있어야 한다.

---

## 1. 기능 목록과 우선순위

### 우선순위 기준

- **P0 (MVP)**: 이것만 있어도 "학습 도구"로 쓸 수 있는 핵심
- **P1**: 학습 효과를 크게 올리는 기능
- **P2**: 있으면 좋은 부가 기능

| #   | 기능               | 우선순위 | 설명                                                                                                                     |
| --- | ------------------ | :------: | ------------------------------------------------------------------------------------------------------------------------ |
| F1  | 공통 체스판        |    P0    | 드래그/클릭 이동, 합법 수 표시, 프로모션 선택, 보드 뒤집기, 기보(수 목록), 이전/다음 수 탐색                             |
| F2  | 분석 보드          |    P0    | 임의의 FEN/PGN을 놓고 엔진 평가(평가 막대, 최선 수 화살표, 상위 N개 수순) 확인. 엔진 연동 검증용 겸 독립 기능            |
| F3  | AI 대국            |    P0    | 10단계 난이도, 색 선택, 무르기/힌트(연습 모드), 기권·무승부, 종료 후 자동 저장                                           |
| F4  | 게임 리뷰          |    P0    | 수마다 평가(최선/좋음/부정확/실수/블런더 + 이론수), 최선 수와 예상 수순 제시, 정확도(%), 평가 그래프, 핵심 순간 바로가기 |
| F5  | 체스 퍼즐          |    P0    | Lichess 퍼즐 DB 기반. 난이도(레이팅)별·테마별 선택, 사용자 퍼즐 레이팅, 힌트, 해답 보기                                  |
| F6  | 오프닝 학습        |    P1    | 현재 국면의 오프닝 이름 표시(대국·리뷰 공통), 오프닝 탐색기, 초보자 추천 레퍼토리 따라두기 드릴(간격 반복)               |
| F7  | 중반 전략 레슨     |    P1    | 단계형 인터랙티브 레슨(설명 → 국면 → "수를 찾아보세요" 과제)                                                             |
| F8  | 엔드게임 레슨      |    P1    | 기본 메이트(Q, R, 2B), 킹+폰 엔드게임, 오포지션 등. 레슨 후 엔진 상대로 "이 국면을 이겨보세요" 실습                      |
| F9  | 진행 상황 대시보드 |    P1    | 퍼즐 레이팅 추이, 대국 전적, 평균 정확도, 레슨/오프닝 진도, 연속 학습일                                                  |
| F10 | 내 실수로 배우기   |    P1    | 리뷰에서 나온 실수/블런더 국면을 개인 퍼즐로 자동 저장 → 나중에 다시 풀기 (간격 반복)                                    |
| F11 | 데이터 백업/복원   |    P1    | IndexedDB 전체를 JSON으로 내보내기/가져오기 (브라우저 데이터 삭제 대비)                                                  |
| F12 | 좌표 훈련          |    P2    | 칸 이름을 보고 클릭 / 강조된 칸 이름 맞히기. 기보 읽기 능력의 기초                                                       |
| F13 | 퍼즐 러시          |    P2    | 제한 시간 내 쉬운 것부터 점점 어려운 퍼즐 연속 풀기 (3번 틀리면 종료)                                                    |
| F14 | 위협 표시 코칭     |    P2    | 연습 모드에서 "잡힐 수 있는 무방비 기물", "상대가 노리는 수"를 시각화 (초보자 블런더 방지 습관)                          |
| F15 | PGN 가져오기       |    P2    | 외부(chess.com/lichess)에서 둔 게임 PGN을 붙여넣어 리뷰                                                                  |
| F16 | 오늘의 학습        |    P2    | 매일 퍼즐 N개 + 실수 복습 + 레슨 1개 추천 카드, 일일 목표/스트릭                                                         |
| F17 | PWA 오프라인       |    P2    | 서비스 워커로 엔진·데이터 캐시 → 오프라인 사용                                                                           |

### 초보자를 위해 추가로 제안하는 기능 (위 표의 F10~F17)

- **내 실수로 배우기(F10)**: 가장 효과가 큰 기능. 남의 퍼즐보다 *내가 실제로 놓친 수*를 반복하는 것이 실전에 바로 이어진다.
- **위협 표시 코칭(F14)**: 초보자 패배의 대부분은 "기물을 공짜로 줌". 수를 두기 전 체크/잡기/위협(CCT)을 확인하는 습관을 시각적으로 훈련.
- **좌표 훈련(F12)**: 레슨·리뷰에서 `Nf3` 같은 표기를 바로 읽을 수 있게 해 다른 모든 학습의 효율을 올린다.
- **오늘의 학습/스트릭(F16)**: 짧게라도 매일 하도록 동기 부여.
- **데이터 백업(F11)**: 서버가 없으므로 브라우저 데이터가 지워지면 진도가 사라진다. 필수에 가까움.

---

## 2. 기술 스택

| 영역        | 선택                                                                           | 비고                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 빌드        | Vite + React 18/19 + TypeScript (strict)                                       |                                                                                                                             |
| 체스 규칙   | `chess.js` (v1.x)                                                              | 합법 수, FEN/PGN, 종료 판정                                                                                                 |
| 체스판 UI   | `react-chessboard`                                                             | **메이저 버전을 고정**(v4→v5에서 props API가 바뀜). 설치 시점 문서 기준으로 래퍼 작성                                       |
| 엔진        | `stockfish` npm 패키지(nmrugg/stockfish.js)의 **lite single-thread WASM 빌드** | 엔진 JS 파일 자체가 Worker 스크립트 → `new Worker(url)`로 실행. 단일 스레드 빌드는 COOP/COEP 헤더 불필요 → 정적 호스팅 호환 |
| 상태 관리   | `zustand`                                                                      | 페이지 단위 스토어. Phase 3까지는 React state로 충분해서 아직 설치하지 않음 (여러 화면이 상태를 공유할 때 도입)                |
| 저장소      | IndexedDB + `dexie`                                                            | 스키마 버전 관리, 쿼리 편의                                                                                                 |
| 라우팅      | `react-router`                                                                 | 정적 호스팅 대비 HashRouter 또는 404 fallback                                                                               |
| 스타일      | CSS Modules + CSS 변수(라이트/다크 테마)                                       | 의존성 최소화                                                                                                               |
| 차트        | 평가 그래프·레이팅 추이용 경량 라이브러리(`recharts` 등) 또는 직접 SVG         | Phase 4에서 결정                                                                                                            |
| 테스트      | Vitest (+ fake-indexeddb), React Testing Library                               | E2E(Playwright)는 P2                                                                                                        |
| 데이터 빌드 | Node 스크립트(`tsx`로 실행)                                                    | 퍼즐/오프닝 원본 → 앱용 JSON                                                                                                |
| 품질        | ESLint + Prettier                                                              |                                                                                                                             |

### 라이선스 메모

- Lichess 퍼즐 DB, `lichess-org/chess-openings`: **CC0** → 자유 사용.
- Stockfish: **GPLv3** → 앱을 공개 배포하면 GPL 의무(소스 공개, 라이선스 고지)가 생긴다. 공개 배포 시 저장소 공개 + About 페이지에 고지.

---

## 3. 폴더 구조

```
chess_training/
├─ CLAUDE.md
├─ PLAN.md
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ public/
│  ├─ engine/                    # stockfish-*.js + .wasm (postinstall 스크립트로 node_modules에서 복사)
│  └─ data/                      # 빌드 스크립트 산출물 (앱이 fetch로 지연 로딩)
│     ├─ puzzles/
│     │  ├─ index.json           # 레이팅 구간·테마별 개수, 샤드 목록
│     │  └─ r0600.json …         # 레이팅 100 단위 샤드
│     └─ openings/
│        ├─ openings.json        # EPD → {eco, name} 맵
│        └─ repertoire.json      # 초보자 추천 레퍼토리 (큐레이션)
├─ scripts/                      # 데이터 빌드 (Node, 앱 번들에 포함되지 않음)
│  ├─ copy-engine.ts
│  ├─ build-puzzles.ts           # lichess_db_puzzle.csv.zst → 샘플링 → 샤드 JSON
│  └─ build-openings.ts          # a.tsv~e.tsv → openings.json
├─ raw-data/                     # 다운로드한 원본 (.gitignore)
└─ src/
   ├─ main.tsx
   ├─ app/                       # 앱 셸
   │  ├─ App.tsx
   │  ├─ routes.tsx
   │  └─ Layout.tsx              # 사이드 내비게이션
   ├─ core/                      # ★ 순수 TS. React/DOM 의존 금지. 단위 테스트 대상
   │  ├─ chess/                  # chess.js 위의 얇은 헬퍼 (uci↔san, fen 정규화/EPD, pgn 파싱)
   │  ├─ engine/
   │  │  ├─ EngineClient.ts      # Worker 래퍼: 큐, 취소(stop), Promise API
   │  │  ├─ uci.ts               # UCI 출력 파싱 (info/bestmove)
   │  │  ├─ score.ts             # Score 타입(cp|mate), 백 관점 정규화, 승률 변환
   │  │  └─ strength.ts          # 난이도 레벨 → 엔진 옵션/수 선택 정책
   │  ├─ review/
   │  │  ├─ classify.ts          # 승률 손실 → 수 등급
   │  │  ├─ accuracy.ts          # 수별/게임 정확도
   │  │  └─ reviewGame.ts        # 게임 전체 분석 파이프라인 (진행률 콜백, 취소)
   │  ├─ puzzles/
   │  │  ├─ types.ts
   │  │  ├─ loader.ts            # 샤드 지연 로딩 + 메모리 캐시
   │  │  ├─ selector.ts          # 레이팅/테마/미해결 기준 다음 퍼즐 선택
   │  │  └─ rating.ts            # Glicko-2 (사용자 퍼즐 레이팅)
   │  ├─ openings/
   │  │  ├─ lookup.ts            # 수순 → 가장 깊게 일치하는 오프닝 이름
   │  │  └─ drill.ts             # 레퍼토리 라인 드릴 진행 로직
   │  ├─ lessons/
   │  │  ├─ types.ts             # Lesson, Step(설명/수 찾기/엔진 상대 실습)
   │  │  └─ runner.ts            # 스텝 진행·정답 판정 상태 머신
   │  └─ srs/
   │     └─ scheduler.ts         # 간격 반복 (오프닝 드릴, 실수 퍼즐 공용)
   ├─ db/
   │  ├─ schema.ts               # Dexie 스키마·버전 마이그레이션
   │  └─ repos/                  # games, reviews, puzzles, openings, lessons, stats, engineCache, backup
   ├─ features/                  # 화면 단위 (React)
   │  ├─ board/                  # Board 래퍼, PromotionDialog, MoveList, EvalBar, useChessGame, useEngine
   │  ├─ analysis/
   │  ├─ play/
   │  ├─ review/
   │  ├─ puzzles/
   │  ├─ openings/
   │  ├─ lessons/
   │  ├─ dashboard/
   │  └─ training/               # 좌표 훈련, 퍼즐 러시 등 P2
   ├─ content/
   │  └─ lessons/                # 레슨 데이터 (TS 객체, 타입 검사됨)
   │     ├─ middlegame/
   │     └─ endgame/
   ├─ shared/                    # 공용 UI 컴포넌트, 훅, 유틸
   └─ styles/
```

---

## 4. 주요 모듈 설계

### 4.1 엔진 (`core/engine`)

```ts
type Score = { type: 'cp'; value: number } | { type: 'mate'; value: number }; // 항상 백 관점으로 정규화

interface AnalysisLine {
  multipv: number;
  depth: number;
  score: Score;
  pv: string[]; /* UCI */
}

interface EngineClient {
  init(): Promise<void>; // uci → uciok → isready
  setOptions(opts: Record<string, string | number>): Promise<void>;
  analyze(
    fen: string,
    limit: { depth?: number; movetime?: number; multipv?: number },
    onInfo?: (lines: AnalysisLine[]) => void,
  ): Promise<{ bestmove: string; lines: AnalysisLine[] }>;
  stop(): void; // 진행 중 탐색 취소
  terminate(): void;
}
```

- 요청은 **직렬 큐**로 처리. 새 요청이 오면 이전 탐색을 `stop`하고 해당 `bestmove`를 버린다(요청 ID로 구분).
- Stockfish 점수는 "둘 차례 기준" → `score.ts`에서 **백 관점으로 정규화**해 이후 모든 코드는 백 관점만 다룬다.
- 엔진 인스턴스는 기능 화면 진입 시 생성, 이탈 시 `terminate` (공용 훅 `useEngine`).

**난이도(`strength.ts`)** — 레벨 1~10:

| 레벨                                                                 | 방식                                                                                                                                                        |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1~3 (입문)                                                           | `Skill Level` 0~3 + 낮은 depth + **MultiPV 후보 중 확률적 선택**(가끔 차선/실수 수를 둠). Stockfish의 `UCI_Elo` 최저값(약 1320)보다 약한 상대를 만들기 위함 |
| 4~6                                                                  | `Skill Level` 5~12, movetime 제한                                                                                                                           |
| 7~10                                                                 | `UCI_LimitStrength=true` + `UCI_Elo` 1400~2200                                                                                                              |
| 매핑 테이블은 한 곳(`strength.ts`)에만 두고 플레이테스트로 조정한다. |

### 4.2 게임 리뷰 (`core/review`)

- 각 국면(시작 ~ 마지막 수 이후)을 고정 depth(기본 14, 설정 가능)로 분석. 결과는 `engineCache`(키: `EPD|depth`)에 저장해 재리뷰 시 재사용.
- **승률 변환** (Lichess 공식): `win% = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)`, 메이트는 0/100으로 처리.
- **수 등급** — 둔 쪽 관점 승률 손실 Δ 기준 (상수는 `classify.ts` 한 곳에서 관리):
  | 등급         | 조건                                                 |
  | ------------ | ---------------------------------------------------- |
  | 이론수(Book) | 오프닝 DB에 있는 국면                                |
  | 최선         | 엔진 1순위 수와 동일, 또는 Δ < 1                     |
  | 좋음         | Δ < 5                                                |
  | 부정확       | 5 ≤ Δ < 10                                           |
  | 실수         | 10 ≤ Δ < 20                                          |
  | 블런더       | Δ ≥ 20 (또는 이길 수 있던 메이트를 놓침/메이트 허용) |
- **정확도**: 수별 `103.1668 * exp(-0.04354 * Δ) - 3.1669` (0~100 클램프), 게임 정확도는 평균(추후 가중 평균 고려).
- 출력: `ReviewedMove { ply, san, classification, evalBefore, evalAfter, bestMoveSan, pvSan[] }[]` + 양측 정확도 + 핵심 순간(Δ 큰 상위 수).
- 초보자용 짧은 설명 템플릿(P1): 최선 수순에서 기물 득실을 계산해 "이 수 다음 상대가 나이트를 공짜로 잡을 수 있었어요" 같은 문장 생성.

### 4.3 퍼즐 (`core/puzzles`, `scripts/build-puzzles.ts`)

- 원본: `https://database.lichess.org/lichess_db_puzzle.csv.zst` (수백만 개, 압축 해제 시 수백 MB) → **앱에 전체를 넣지 않는다.**
- 빌드 스크립트가 샘플링:
  - 필터: `Popularity ≥ 80`, `NbPlays ≥ 100`, `RatingDeviation ≤ 90`
  - 레이팅 400~2200 구간을 100 단위로 나눠 구간당 최대 N개(예: 1,000), 초보 핵심 테마(mateIn1, mateIn2, fork, pin, skewer, hangingPiece, discoveredAttack, backRankMate, endgame 등)가 골고루 포함되도록 할당
  - 출력 필드 축약: `{ id, fen, moves, rating, themes }`, 전체 목표 크기 **≤ 10MB**
- **주의**: CSV의 FEN은 "상대가 첫 수를 두기 전" 국면이고 `Moves`의 첫 수는 상대 수다. 퍼즐 화면은 첫 수를 애니메이션으로 자동 진행한 뒤 사용자 차례를 시작한다.
- 정답 판정: 사용자의 수가 기대 수와 같거나, **그 수로 즉시 체크메이트가 되면** 정답 인정(Lichess 규칙과 동일).
- 사용자 레이팅: Glicko-2, 초기 1000. 성공/실패와 퍼즐 레이팅으로 갱신. 힌트·해답 보기 사용 시 실패 처리.

### 4.4 오프닝 (`core/openings`, `scripts/build-openings.ts`)

- 원본: `lichess-org/chess-openings`의 `a.tsv`~`e.tsv` (`eco`, `name`, `pgn`).
- 빌드 스크립트가 각 라인을 chess.js로 재생해 **최종 국면 EPD → {eco, name}** 맵 생성 (수순 순서가 달라도 같은 국면이면 인식 = 전치 대응).
- `lookup.ts`: 게임의 각 국면 EPD를 맵에서 찾아 가장 마지막으로 일치한 이름을 반환. 대국·리뷰·분석 화면 공통 사용, 리뷰의 "이론수" 판정에도 사용.
- 학습용 레퍼토리(`repertoire.json`): 데이터셋은 이름 목록일 뿐이므로 **초보자용 라인을 직접 큐레이션** (백: 이탈리안, 런던 / 흑: e4에 대한 e5·카로칸, d4에 대한 퀸즈 갬빗 디클라인드 등). 각 수에 짧은 설명(왜 이 수를 두는가) 포함.
- 드릴: 사용자는 한쪽 색을 맡아 라인을 따라 두고, 상대 수는 자동. 틀리면 정답 표시 후 재시도. 라인 단위 간격 반복(`srs/scheduler.ts`, Leitner 방식으로 시작).

### 4.5 레슨 (`core/lessons`, `content/lessons`)

```ts
type LessonStep =
  | { kind: 'explain'; text: string; fen?: string; arrows?: Arrow[]; highlights?: Square[] }
  | {
      kind: 'findMove';
      fen: string;
      prompt: string;
      solutions: string[] /* UCI 라인 */;
      hint?: string;
      explanation: string;
    }
  | {
      kind: 'playOut';
      fen: string;
      goal: 'win' | 'draw' | 'mate';
      engineLevel: number;
      maxMoves?: number;
    };
interface Lesson {
  id: string;
  category: 'middlegame' | 'endgame' | 'tactics-basics';
  title: string;
  level: 1 | 2 | 3;
  steps: LessonStep[];
}
```

- 레슨 내용은 TS 파일로 작성 → 타입 검사 + 빌드 시 모든 FEN/수의 합법성을 테스트로 검증.
- 커리큘럼 초안:
  - **전술 기초**: 무방비 기물, 포크, 핀, 스큐어, 디스커버드 어택, 백랭크 메이트
  - **중반 전략**: 오프닝 3원칙(중앙·전개·캐슬링), 기물 가치와 교환, 좋은/나쁜 비숍, 오픈 파일과 룩, 약한 폰(고립·더블), 아웃포스트, 킹 안전, 계획 세우기
  - **엔드게임**: 킹+퀸 메이트, 킹+룩 메이트, 킹+폰 vs 킹(오포지션, 사각형 규칙), 패시브/액티브 룩, 루세나·필리도어(기초), 스테일메이트 주의

### 4.6 저장소 (`db/schema.ts`, Dexie)

| 테이블            | 키 / 인덱스                   | 내용                                           |
| ----------------- | ----------------------------- | ---------------------------------------------- |
| `games`           | `++id`, `createdAt`, `source` | PGN, 결과, 사용자 색, AI 레벨, 출처(ai/import) |
| `reviews`         | `gameId`                      | ReviewedMove[], 정확도, 분석 depth             |
| `engineCache`     | `key`(EPD\|depth)             | 점수, 최선 수, PV (용량 상한·오래된 항목 정리) |
| `puzzleAttempts`  | `++id`, `puzzleId`, `at`      | 성공 여부, 소요 시간, 레이팅 변화              |
| `mistakes`        | `++id`, `gameId`, `due`       | 실수 국면 FEN, 정답 수, SRS 필드               |
| `openingProgress` | `lineId`, `due`               | SRS 필드                                       |
| `lessonProgress`  | `lessonId`                    | 현재 스텝, 완료 시각                           |
| `kv`              | `key`                         | 사용자 레이팅(Glicko 값), 설정, 스트릭 등      |

- 스키마 변경 시 반드시 `db.version(n+1)`로 올리고 마이그레이션 작성. 백업 JSON에는 스키마 버전 포함.

---

## 5. 구현 단계와 완료 기준

> 규칙: 각 Phase 종료 시 `npm run lint`, `npm run typecheck`, `npm test`가 통과하고, 아래 "확인 방법"대로 직접 실행해 볼 수 있어야 한다. 완료한 항목은 체크박스를 채운다.

### Phase 0 — 프로젝트 골격

- [x] Vite + React + TS(strict) 생성, ESLint/Prettier, Vitest 설정
- [x] 라우터와 레이아웃(사이드 내비: 홈/대국/리뷰/퍼즐/오프닝/레슨/분석), 각 페이지는 placeholder
- [x] 스크립트: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`
- [x] 라이트/다크 테마 CSS 변수

**완료 기준**: `npm run dev`로 내비게이션 이동 가능 / `npm run build && npm run preview` 정상 / 샘플 테스트 1개 통과

> ✅ 완료 (2026-10-09). 설치된 주요 버전: Node 24, React 19, Vite 8, TypeScript 6, react-router 8, Vitest 5, ESLint 10.
> 라우팅은 정적 호스팅 호환을 위해 해시 라우터(`#/puzzles` 형태)로 확정. 테스트 3개(메뉴 표시·페이지 이동·404) 통과.

### Phase 1 — 체스판과 로컬 대국 (F1)

- [x] `core/chess` 헬퍼 (uci↔san, EPD, PGN 생성/파싱) + 테스트
- [x] `features/board`: react-chessboard 래퍼, 합법 수 하이라이트, 클릭 이동 + 드래그 이동, 프로모션 선택 UI, 마지막 수·체크 표시, 뒤집기
- [x] `useChessGame` 훅: 수 진행, 무르기, 히스토리 탐색(←/→ 키), 종료 판정(메이트/스테일메이트/3회 반복/50수/기물 부족)
- [x] 기보(MoveList) 컴포넌트: 클릭 시 해당 국면 이동

**완료 기준**: 분석 페이지에서 한 사람이 양쪽을 두어 끝까지 대국 가능 / 불법 수 불가 / 프로모션·앙파상·캐슬링 동작 / 종료 시 결과 표시 / PGN 복사

> ✅ 완료 (2026-10-09). chess.js 1.4, react-chessboard 5.12 사용. 테스트 26개 통과.
> 브라우저에서 클릭·드래그 이동, 불법 수 거부, 프로모션 선택(나이트 승격), 체크메이트 판정, 기보 탐색(버튼·키보드), 무르기, 판 뒤집기, 모바일 레이아웃 확인.
> 앙파상·캐슬링·스테일메이트·3회 반복·50수·기물 부족은 단위 테스트로 확인.
> 클립보드 권한이 막힌 환경에서는 PGN을 텍스트 상자로 보여주어 직접 복사하게 함.

### Phase 2 — 엔진 연동과 분석 보드 (F2)

- [x] `scripts/copy-engine.ts`(postinstall)로 Stockfish lite single-thread 빌드를 `public/engine/`에 복사
- [x] `EngineClient`(큐·취소·Promise), `uci.ts` 파서, `score.ts` 정규화 + 테스트(파서·정규화는 모의 출력으로 테스트)
- [x] `useEngine` 훅(생성/정리), 평가 막대, 최선 수 화살표, MultiPV 3줄 표시(SAN), depth 표시
- [x] FEN/PGN 입력란

**완료 기준**: 분석 페이지에서 아무 국면이나 두면 1초 내 평가가 갱신되고, 빠르게 수를 바꿔도 이전 결과가 섞이지 않음 / 메이트 국면에서 "M3" 등 표시 / 콘솔 에러 없음 / `npm run preview`(프로덕션 빌드)에서도 엔진 동작

> ✅ 완료 (2026-10-09). Stockfish 19 lite single-thread(wasm 1.8MB) 사용. 훅 이름은 `useEngineAnalysis`. 테스트 43개 통과.
> 측정: 첫 평가 표시 약 0.6~0.8초(엔진 로딩 포함), 시작 국면 깊이 18 완료 약 3.6초.
> 브라우저 확인: 빠르게 6수를 두는 동안 매 순간 후보 수가 해당 국면 차례와 일치(결과 섞임 없음), M1 / -M1 표시,
> 메이트 후 평가 막대 "0-1", 불가능한 FEN 거부, PGN 불러오기, 엔진 끄기/켜기, 페이지 이탈 시 Worker 종료(생성 1·종료 1),
> 프로덕션 빌드(`npm run preview`)·모바일 레이아웃.
> `public/engine/`은 설치 시 자동 생성되므로 git에서 제외. 후보 수순을 누르면 그 첫 수를 두는 기능 추가.

### Phase 3 — AI 대국 (F3)

- [ ] `strength.ts` 레벨 1~10 매핑 + 입문 레벨의 확률적 수 선택 + 테스트(선택 정책은 시드 고정 난수로 테스트)
- [ ] 대국 설정 화면(레벨, 색: 백/흑/랜덤, 연습 모드 on/off)
- [ ] 대국 화면: AI 응수(약간의 지연으로 자연스럽게), 기권/무승부 제안, 연습 모드에서 무르기·힌트, 현재 오프닝 이름 표시(Phase 6 전에는 생략 가능)
- [ ] Dexie 스키마 v1 + `games` 저장소, 종료 시 자동 저장, "이 게임 리뷰하기" 버튼(Phase 4에서 연결)
- [ ] 지난 게임 목록 페이지

**완료 기준**: 레벨 1은 초보자가 이길 수 있을 만큼 실수하고, 레벨 10은 확연히 강함(직접 플레이로 확인) / 새로고침 후에도 게임 목록 유지 / AI가 생각하는 동안 사용자 입력 차단

### Phase 4 — 게임 리뷰 (F4) ★MVP 핵심

- [ ] `classify.ts`, `accuracy.ts` + 경계값 테스트(메이트 점수, 이미 진 국면에서의 손실 등)
- [ ] `reviewGame.ts`: 국면별 분석, 진행률 콜백, 취소, `engineCache` 재사용
- [ ] 리뷰 화면: 진행 바 → 요약(양측 정확도, 등급별 개수) → 수 목록에 등급 아이콘/색 → 수 선택 시 "둔 수 vs 최선 수" 화살표 비교와 최선 수순 → 평가 그래프(클릭 시 해당 수로 이동) → 핵심 순간 버튼(다음 실수로 이동)
- [ ] "최선 수 다시 두어보기": 실수 국면에서 사용자가 직접 정답을 찾아보는 모드
- [ ] 리뷰 결과 `reviews`에 저장 (재방문 시 즉시 표시)

**완료 기준**: 40수 게임 리뷰가 일반 노트북에서 1분 내외로 완료되고 진행률 표시 / 일부러 퀸을 공짜로 준 수가 블런더로 표시 / 엔진 1순위 수는 최선으로 표시 / 리뷰 도중 페이지 이탈 시 엔진 정지

> **여기까지가 MVP (P0 중 대국·리뷰)**

### Phase 5 — 퍼즐 (F5)

- [ ] `scripts/build-puzzles.ts`: 원본 다운로드 안내(또는 자동 다운로드) → zstd 스트림 해제 → CSV 스트리밍 파싱 → 샘플링 → 샤드 JSON + `index.json`
- [ ] `loader.ts`(샤드 지연 로딩), `selector.ts`(사용자 레이팅 ±150, 테마 필터, 최근 푼 퍼즐 제외), `rating.ts`(Glicko-2) + 테스트
- [ ] 퍼즐 화면: 상대 첫 수 자동 진행 → 사용자 수 판정(정답 ✓/오답 ✗) → 연속 수 자동 응수 → 결과·레이팅 변화 → 다음 퍼즐 / 힌트(움직일 기물 강조) / 해답 보기 / 풀고 나서 분석 보드로 열기
- [ ] 퍼즐 메뉴: "내 레벨에 맞게"(기본), 테마 선택(한국어 이름·설명), 난이도 직접 선택
- [ ] `puzzleAttempts` 저장, 퍼즐 레이팅 `kv` 저장

**완료 기준**: 테마 "mateIn1" 선택 시 해당 테마 퍼즐만 출제 / 대체 메이트 수도 정답 처리 / 연속 정답 시 레이팅 상승 / 새로고침 후 레이팅 유지 / `public/data/puzzles` 전체 크기 ≤ 10MB

### Phase 6 — 오프닝 (F6)

- [ ] `scripts/build-openings.ts` → `openings.json` (+ 데이터 검증 테스트)
- [ ] `lookup.ts` + 대국/리뷰/분석 화면에 오프닝 이름 표시, 리뷰에 "이론수" 등급 연결
- [ ] 오프닝 탐색기: 수를 두면 현재 이름과 DB에 있는 다음 수 후보(이어지는 오프닝 이름) 표시
- [ ] `repertoire.json` 큐레이션(백 2개, 흑 2~3개 라인 계열, 수별 설명)
- [ ] 드릴 화면 + `srs/scheduler.ts` + `openingProgress` 저장

**완료 기준**: 1.e4 e5 2.Nf3 Nc6 3.Bc4 를 두면 "Italian Game" 표시 / 수순을 바꿔 같은 국면에 도달해도 인식 / 드릴에서 틀린 라인이 다음 날 복습 목록에 다시 등장

### Phase 7 — 레슨 (F7, F8)

- [ ] `lessons/types.ts`, `runner.ts`(스텝 상태 머신) + 테스트
- [ ] 모든 레슨 콘텐츠의 FEN·정답 수 합법성 자동 검증 테스트
- [ ] 레슨 목록(카테고리·진도 표시) / 레슨 화면(explain, findMove, playOut 스텝 렌더링)
- [ ] `playOut`: 지정 국면에서 엔진(지정 레벨)과 대국, 목표 달성 판정(예: 30수 이내 메이트)
- [ ] 콘텐츠 1차: 전술 기초 6개, 중반 전략 6개, 엔드게임 6개
- [ ] `lessonProgress` 저장

**완료 기준**: "킹+룩 메이트" 레슨을 처음부터 끝까지 진행하고 엔진 상대로 메이트하면 완료 표시 / 중간에 나갔다 와도 이어서 진행 / 콘텐츠 검증 테스트 통과

### Phase 8 — 대시보드와 학습 루프 연결 (F9, F10, F11)

- [ ] 홈 대시보드: 퍼즐 레이팅 추이 그래프, 최근 대국 정확도, 레슨/오프닝 진도, 연속 학습일
- [ ] 리뷰 완료 시 실수/블런더 국면을 `mistakes`에 저장 → "내 실수 복습" 모드(퍼즐 화면 재사용, SRS)
- [ ] 리뷰 결과의 실수 유형(예: 무방비 기물 손실)에 따라 관련 레슨/퍼즐 테마 추천 (간단한 규칙 기반)
- [ ] 설정 화면: 데이터 내보내기/가져오기(JSON), 전체 초기화, 리뷰 분석 depth

**완료 기준**: 게임 → 리뷰 → 홈에 "복습할 실수 N개" 표시 → 풀면 다음 복습일로 이동 / 내보낸 JSON을 다른 브라우저 프로필에 가져와 같은 상태 복원

### Phase 9 — 부가 기능 (P2, 순서 자유)

- [ ] F12 좌표 훈련 (백/흑 시점, 30초 기록)
- [ ] F13 퍼즐 러시 (3분/5분, 3회 오답 종료, 최고 기록)
- [ ] F14 위협 표시 코칭 (연습 모드에서 무방비 기물·상대의 잡기/체크 표시 토글)
- [ ] F15 PGN 가져오기 → 리뷰
- [ ] F16 오늘의 학습 카드 + 일일 목표
- [ ] F17 PWA (서비스 워커로 엔진·데이터 캐시)
- [ ] Playwright E2E: 대국→리뷰, 퍼즐 1개 풀기 스모크 테스트

**완료 기준**: 기능별로 화면에서 직접 동작 확인 / PWA는 네트워크 끊은 상태에서 대국·퍼즐 가능

---

## 6. 리스크와 대응

| 리스크                                             | 대응                                                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Stockfish 최저 Elo(약 1320)가 초보자에게 너무 강함 | 레벨 1~3은 MultiPV 확률 선택으로 약화, 플레이테스트로 튜닝                                         |
| 리뷰 분석이 느림 (단일 스레드)                     | depth 설정 가능, 결과 캐시, 진행률 표시. 필요 시 멀티스레드 빌드 + COOP/COEP 헤더 지원 호스팅 검토 |
| 퍼즐 원본이 너무 큼                                | 빌드 타임 샘플링·샤딩, 런타임은 필요한 샤드만 fetch                                                |
| react-chessboard 메이저 버전 간 API 차이           | 버전 고정, `features/board`의 래퍼 한 곳에서만 사용                                                |
| 브라우저 데이터 삭제로 진도 유실                   | Phase 8 백업/복원, `navigator.storage.persist()` 요청                                              |
| 엔진 점수 관점(둘 차례 vs 백) 혼동 버그            | `score.ts`에서 즉시 백 관점으로 정규화, 테스트로 고정                                              |
| GPL(Stockfish) 의무                                | 공개 배포 시 소스 공개·고지                                                                        |
