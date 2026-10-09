# CLAUDE.md

## 프로젝트 개요

초보자를 위한 **브라우저 전용 체스 학습 웹 앱**. chess.com처럼 AI 대국, 게임 리뷰(수별 평가), 퍼즐, 오프닝, 중반·엔드게임 레슨을 제공한다.
사용자는 행마법과 기초 전략만 아는 초보자이므로 UI 문구와 설명은 **쉬운 한국어**로 쓴다.

- 서버 없음. 정적 파일만으로 동작해야 한다.
- 진행 상황은 IndexedDB(Dexie)에 저장한다.
- 전체 계획, 단계, 완료 기준은 [PLAN.md](PLAN.md) 참고. **작업은 PLAN.md의 Phase 순서대로** 진행하고, 끝낸 항목은 체크박스를 갱신한다.

## 기술 스택

- React + TypeScript(strict) + Vite
- 체스 규칙: `chess.js` / 체스판: `react-chessboard`(메이저 버전 고정)
- 엔진: `stockfish` npm 패키지의 lite single-thread WASM 빌드를 Web Worker로 실행 (`public/engine/`)
- 상태: `zustand` / 저장소: `dexie` / 라우팅: `react-router`
- 테스트: Vitest, React Testing Library, fake-indexeddb
- 데이터: Lichess 퍼즐 DB, `lichess-org/chess-openings` (둘 다 CC0) → `scripts/`에서 JSON으로 변환해 `public/data/`에 둠

## 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 결과 확인 (엔진 WASM 로딩은 반드시 여기서도 확인)
npm run lint
npm run typecheck
npm test             # vitest
npm run data:openings   # chess-openings TSV → public/data/openings
npm run data:puzzles    # Lichess 퍼즐 CSV → public/data/puzzles (raw-data/ 필요)
```

## 폴더 구조 요약

- `src/core/` — 순수 TypeScript 도메인 로직 (chess 헬퍼, engine, review, puzzles, openings, lessons, srs)
- `src/db/` — Dexie 스키마와 저장소(repository)
- `src/features/<기능>/` — 화면 단위 React 코드 (board, analysis, play, review, puzzles, openings, lessons, dashboard, training)
- `src/content/lessons/` — 레슨 데이터 (TS 객체)
- `src/shared/` — 공용 UI·훅·유틸
- `scripts/` — 데이터 빌드용 Node 스크립트 (앱 번들에 포함 금지)
- `raw-data/` — 다운로드한 원본 데이터 (커밋 금지)

## 코딩 규칙

### 절대 규칙

1. **체스 규칙을 직접 구현하지 않는다.** 합법 수, 체크/메이트 판정, FEN/PGN 처리는 모두 chess.js를 사용한다.
2. **체스 AI/평가 함수를 직접 구현하지 않는다.** 모든 평가와 AI 수는 Stockfish에서 가져온다. 난이도 조절은 엔진 옵션과 엔진 후보 수 중에서의 선택으로만 한다.
3. **엔진은 `EngineClient`를 통해서만 사용한다.** 컴포넌트에서 Worker를 직접 만들거나 UCI 문자열을 보내지 않는다. 화면 이탈 시 엔진을 반드시 정리(`stop`/`terminate`)한다.
4. **엔진 점수는 `core/engine/score.ts`에서 즉시 백 관점으로 정규화**한다. 그 밖의 코드는 "둘 차례 기준" 점수를 다루지 않는다.
5. **IndexedDB 접근은 `src/db/repos/`를 통해서만** 한다. 스키마 변경 시 Dexie 버전을 올리고 마이그레이션을 작성한다.
6. 서버 API를 추가하지 않는다. 외부 네트워크 의존(예: Lichess API)은 기본 기능에 넣지 않는다.

### 구조

- `src/core/`는 React, DOM, `window`, IndexedDB에 의존하지 않는다 (Worker 생성은 주입받은 팩토리로). 그래야 Vitest로 바로 테스트할 수 있다.
- 기능 간 import는 `core/`, `db/`, `shared/`, `features/board`를 통해서만 한다. `features/puzzles`가 `features/review`를 직접 import하지 않는다.
- 수 등급 임계값, 난이도 매핑, SRS 간격 같은 **튜닝 상수는 각 모듈의 한 곳에만** 정의한다.
- react-chessboard는 `features/board`의 래퍼 컴포넌트에서만 import한다.

### TypeScript

- `strict` 사용, `any` 금지 (불가피하면 `unknown` 후 좁히기). 외부 데이터(JSON fetch, IndexedDB, 가져오기 파일)는 경계에서 검증한다.
- 수 표현을 명확히 구분한다: 내부 저장·엔진 통신은 **UCI**(`e2e4`, `e7e8q`), 화면 표시는 **SAN**(`e4`, `exd8=Q+`). 변수명에도 `uci`/`san`을 붙인다.
- 국면 비교·캐시 키에는 FEN 전체가 아닌 **EPD**(반수/수 번호 제외)를 쓴다.
- 판별 유니언(discriminated union)으로 상태를 표현한다 (`{ kind: 'cp' } | { kind: 'mate' }` 등).

### React

- 함수 컴포넌트 + 훅. 컴포넌트 파일은 `PascalCase.tsx`, 훅은 `useXxx.ts`, 그 외는 `camelCase.ts`.
- 비동기 작업(엔진 분석, 데이터 로딩)은 컴포넌트 언마운트·입력 변경 시 취소되거나 결과가 무시되도록 한다 (요청 ID 또는 AbortController).
- 스타일은 CSS Modules + `src/styles`의 CSS 변수. 라이트/다크 테마를 모두 고려한다.
- 큰 데이터(퍼즐 샤드, 오프닝 맵)는 정적 import하지 말고 `fetch`로 지연 로딩한다.

### 테스트

- `src/core/`의 모든 모듈은 단위 테스트를 둔다 (특히 UCI 파서, 점수 정규화, 수 등급 분류, 정확도, Glicko-2, SRS, 퍼즐 정답 판정).
- 레슨·레퍼토리 콘텐츠는 모든 FEN과 수가 합법인지 자동 검증하는 테스트를 둔다.
- 엔진 자체는 단위 테스트에서 실행하지 않는다. 모의 UCI 출력으로 테스트한다.
- DB 저장소 테스트는 `fake-indexeddb`를 사용한다.

### 데이터

- `raw-data/`의 원본 파일(퍼즐 CSV 등)은 커밋하지 않는다. `public/data/`의 생성 결과는 커밋한다(목표 총량: 퍼즐 ≤ 10MB).
- Lichess 퍼즐의 `FEN`은 상대 첫 수 이전 국면이며 `Moves`의 첫 수는 상대 수임에 유의한다.

### 작업 방식

- 한 번에 한 Phase씩 진행한다. Phase를 마치면 `npm run lint && npm run typecheck && npm test`를 통과시키고, PLAN.md의 완료 기준대로 `npm run dev`(필요하면 `npm run preview`)에서 실제 동작을 확인한다.
- 새 의존성 추가 전에 기존 스택으로 해결 가능한지 먼저 검토하고, 추가했다면 이유를 PLAN.md 기술 스택 표에 반영한다.
- 주석은 "왜"가 필요한 곳(엔진 프로토콜의 특이점, 공식의 출처, 튜닝 상수의 근거)에만 짧게 단다.

## 라이선스 주의

Stockfish는 GPLv3이다. 앱을 공개 배포하면 소스 공개와 라이선스 고지가 필요하다 (About 페이지에 고지).
