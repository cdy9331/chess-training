import type { Lesson } from '../../core/lessons/types';

export const MIDDLEGAME_LESSONS: readonly Lesson[] = [
  {
    id: 'middlegame-opening-principles',
    category: 'middlegame',
    title: '오프닝 3원칙',
    level: 1,
    summary: '중앙 차지, 기물 전개, 캐슬링 — 이것만 지켜도 좋은 중반을 맞이해요.',
    steps: [
      {
        kind: 'explain',
        title: '첫 열 수의 원칙',
        text: [
          '① 중앙(d4·e4·d5·e5)에 폰을 두거나 기물로 중앙을 노려요. 중앙의 기물은 더 많은 칸을 공격할 수 있어요.',
          '② 나이트와 비숍을 빨리 꺼내요(전개). 같은 기물을 여러 번 움직이거나, 퀸을 너무 일찍 꺼내지 않아요.',
          '③ 캐슬링으로 킹을 안전한 곳에 두고 룩을 연결해요.',
        ],
        fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5',
        arrows: [
          { from: 'e1', to: 'g1', tone: 'good' },
          { from: 'b1', to: 'c3', tone: 'good' },
        ],
      },
      {
        kind: 'findMove',
        title: '전개하기',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        prompt: '1.e4 e5 다음이에요. 원칙에 맞게 기물을 하나 전개하세요.',
        solutions: [['Nf3'], ['Nc3'], ['Bc4']],
        hint: '나이트나 비숍을 중앙 쪽으로 꺼내 보세요.',
        explanation:
          '좋아요! 나이트나 비숍을 중앙 쪽으로 꺼내는 수가 원칙적인 수예요. 특히 Nf3는 e5 폰도 공격해요.',
      },
      {
        kind: 'findMove',
        title: '한 번 더 전개',
        fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        prompt: '흑이 나이트를 꺼내 e4를 공격해요. 전개하면서 대응해 보세요.',
        solutions: [['Nc3'], ['Bc4'], ['Nxe5'], ['d3']],
        hint: 'e4 폰을 지키는 나이트 전개나, 반대로 e5를 잡는 수도 있어요.',
        explanation:
          'Nc3는 전개하면서 e4를 지키고, Nxe5는 폰을 맞잡아요. 퀸을 일찍 꺼내거나 같은 기물을 또 움직이는 수보다 훨씬 좋아요.',
      },
    ],
  },
  {
    id: 'middlegame-piece-values',
    category: 'middlegame',
    title: '기물 가치와 교환',
    level: 1,
    summary: '폰 1, 나이트·비숍 3, 룩 5, 퀸 9 — 교환할 때 계산의 기준이에요.',
    steps: [
      {
        kind: 'explain',
        title: '기물의 점수',
        text: [
          '폰 = 1, 나이트 = 3, 비숍 = 3, 룩 = 5, 퀸 = 9점으로 계산해요. 킹은 잃으면 지니까 점수로 따지지 않아요.',
          '서로 잡고 잡히는 교환을 할 때는 점수를 더해 보세요. 비숍(3)을 주고 룩(5)을 얻으면 2점 이득이에요. 반대로 퀸(9)으로 지켜진 폰(1)을 잡으면 큰 손해예요.',
        ],
      },
      {
        kind: 'findMove',
        title: '이득 보는 교환',
        fen: '4k3/8/8/3p4/4r3/8/6B1/7K w - - 0 1',
        prompt: '흑 룩은 d5 폰이 지키고 있어요. 그래도 잡는 게 이득일까요? 이득이면 잡으세요.',
        solutions: [['Bxe4']],
        hint: '비숍(3)을 주고 룩(5)을 얻으면 몇 점 이득인가요?',
        explanation:
          'Bxe4 dxe4로 비숍(3)과 룩(5)을 바꿔서 2점 이득이에요. 이걸 "익스체인지를 얻었다"고 해요.',
      },
    ],
  },
  {
    id: 'middlegame-king-safety',
    category: 'middlegame',
    title: '킹 안전과 캐슬링',
    level: 1,
    summary: '중앙이 열리기 전에 킹을 구석으로 옮겨요.',
    steps: [
      {
        kind: 'explain',
        title: '킹은 구석으로',
        text: [
          '중반에 중앙 파일이 열리면 가운데에 남은 킹은 룩과 퀸의 공격을 받아요. 그래서 오프닝에서 캐슬링으로 킹을 구석으로 옮겨요.',
          '캐슬링한 뒤에는 킹 앞의 폰(f·g·h)을 함부로 밀지 마세요. 폰이 앞으로 나가면 킹을 지키던 벽에 구멍이 생겨요.',
        ],
        fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 2 6',
        highlights: ['g1', 'g8'],
      },
      {
        kind: 'findMove',
        title: '캐슬링할 때',
        fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5',
        prompt: '나이트와 비숍이 나와서 킹과 룩 사이가 비었어요. 킹을 안전하게 하세요.',
        solutions: [['O-O']],
        hint: '킹을 g1으로 두 칸 옮기면 룩이 f1으로 넘어와요.',
        explanation: 'O-O! 킹은 폰 세 개 뒤에 숨고, h1 룩은 f1으로 나와 싸움에 참여해요.',
      },
    ],
  },
  {
    id: 'middlegame-open-file',
    category: 'middlegame',
    title: '오픈 파일과 룩',
    level: 2,
    summary: '폰이 없는 파일에 룩을 두면 상대 진영까지 길이 뚫려요.',
    steps: [
      {
        kind: 'explain',
        title: '룩의 고속도로',
        text: [
          '어느 쪽 폰도 없는 세로줄을 "오픈 파일"이라고 해요. 룩은 막히는 게 없어야 힘을 쓰는데, 오픈 파일에 있으면 상대 진영 깊숙이(7번째 줄)까지 들어갈 수 있어요.',
          '구석에서 잠자는 룩을 오픈 파일로 옮기는 것만으로도 좋은 계획이 돼요.',
        ],
        fen: 'r4rk1/ppp2ppp/2n5/8/8/2N5/PPP2PPP/R4RK1 w - - 0 1',
        highlights: ['d1', 'd8', 'e1', 'e8'],
      },
      {
        kind: 'findMove',
        title: '룩을 오픈 파일로',
        fen: 'r4rk1/ppp2ppp/2n5/8/8/2N5/PPP2PPP/R4RK1 w - - 0 1',
        prompt: 'd파일과 e파일이 열려 있어요. 룩 하나를 오픈 파일로 옮기세요.',
        solutions: [['Rad1'], ['Rfd1'], ['Rae1'], ['Rfe1']],
        hint: '폰이 하나도 없는 파일을 찾아보세요.',
        explanation: '좋아요! 이제 룩이 열린 파일을 따라 흑 진영을 바라봐요.',
      },
    ],
  },
  {
    id: 'middlegame-weak-pawns',
    category: 'middlegame',
    title: '약한 폰',
    level: 2,
    summary: '고립된 폰·더블 폰은 지키기 어려워서 공격 목표가 돼요.',
    steps: [
      {
        kind: 'explain',
        title: '고립된 폰과 더블 폰',
        text: [
          '옆 파일에 같은 편 폰이 없는 폰을 "고립된 폰"이라고 해요. 다른 폰이 지켜 줄 수 없어서 기물로만 지켜야 해요.',
          '같은 파일에 폰 두 개가 겹친 것을 "더블 폰"이라고 해요. 서로 지켜 주지 못하고 앞으로 나가기도 어려워요.',
          '상대의 약한 폰을 찾아 기물로 여러 번 공격하는 것은 중반의 좋은 계획이에요.',
        ],
        fen: '4k3/p7/8/3p4/8/8/PP6/3RK3 w - - 0 1',
        highlights: ['d5'],
      },
      {
        kind: 'findMove',
        title: '고립된 폰 잡기',
        fen: '4k3/p7/8/3p4/8/8/PP6/3RK3 w - - 0 1',
        prompt: 'd5의 고립된 폰을 지켜 줄 폰이 없어요. 잡으세요.',
        solutions: [['Rxd5']],
        hint: '룩이 d파일을 따라 올라갈 수 있어요.',
        explanation: '고립된 폰은 옆의 폰이 지켜 줄 수 없어서 쉽게 잡혀요.',
      },
    ],
  },
  {
    id: 'middlegame-outpost',
    category: 'middlegame',
    title: '아웃포스트',
    level: 3,
    summary: '상대 폰이 쫓아낼 수 없는 튼튼한 칸에 나이트를 세워요.',
    steps: [
      {
        kind: 'explain',
        title: '쫓겨나지 않는 자리',
        text: [
          '내 폰이 지켜 주고, 상대 폰은 공격할 수 없는 칸을 "아웃포스트"라고 해요. 이런 칸에 나이트를 두면 상대가 쫓아내기 어려워서 오래도록 강한 자리를 지켜요.',
          '아래 국면에서 흑의 c·e 폰은 이미 c5·e5로 나가서 d5를 공격할 수 없어요. 그리고 d5는 백의 e4 폰이 지켜 줘요.',
          '흑에게 남은 비숍은 어두운 칸만 다녀서 밝은 칸인 d5를 건드릴 수도 없어요. 상대가 쫓아내거나 교환할 방법이 없는 칸이 진짜 아웃포스트예요.',
        ],
        fen: 'r4rk1/pp2bppp/3p4/2p1p3/4P3/2N5/PPP2PPP/R4RK1 w - - 0 1',
        highlights: ['d5'],
        arrows: [{ from: 'c3', to: 'd5', tone: 'good' }],
      },
      {
        kind: 'findMove',
        title: '나이트를 아웃포스트로',
        fen: 'r4rk1/pp2bppp/3p4/2p1p3/4P3/2N5/PPP2PPP/R4RK1 w - - 0 1',
        prompt: '나이트를 가장 튼튼한 중앙 칸으로 옮기세요.',
        solutions: [['Nd5']],
        hint: '흑 폰이 공격할 수 없고, 백 폰이 지켜 주는 칸이에요.',
        explanation:
          'Nd5! 흑 폰도 비숍도 이 나이트를 쫓아낼 수 없고, e4 폰이 받쳐 줘요. 덤으로 e7 비숍도 공격해요. (엔진도 이 국면의 최선 수로 꼽아요)',
      },
    ],
  },
  {
    id: 'strategy-good-bad-bishop',
    category: 'middlegame',
    title: '좋은 비숍과 나쁜 비숍',
    level: 2,
    summary: '내 폰이 비숍의 길을 막고 있는지 살펴봐요.',
    steps: [
      {
        kind: 'explain',
        title: '폰과 같은 색의 비숍',
        text: [
          '내 폰들이 대부분 비숍과 같은 색 칸에 있으면, 그 비숍은 자기 폰에 길이 막혀 답답해져요. 이런 비숍을 "나쁜 비숍"이라고 해요.',
          '반대로 폰들이 다른 색 칸에 있어 대각선이 활짝 열린 비숍은 "좋은 비숍"이에요.',
          '아래 국면에서 백의 폰(d4·e5)은 어두운 칸에 있어요. 어두운 칸 비숍(c1)은 답답하고, 밝은 칸 비숍(d3)은 흑 킹 쪽을 시원하게 노려요.',
        ],
        fen: 'r2qk2r/pp1nbppp/2p1p3/3pP3/3P4/3B4/PPP2PPP/RNBQK2R w KQkq - 0 1',
        highlights: ['c1', 'd3'],
        arrows: [{ from: 'd3', to: 'h7', tone: 'good' }],
      },
      {
        kind: 'explain',
        title: '나쁜 비숍 다루기',
        text: [
          '① 나쁜 비숍은 폰 사슬 밖으로 먼저 꺼내요(런던 시스템의 Bf4, 카로칸의 Bf5가 그 예예요).',
          '② 상대의 좋은 기물과 교환해 버려요.',
          '③ 앞으로 폰을 둘 때는 내 비숍과 다른 색 칸에 두는 것을 고려해요.',
        ],
      },
    ],
  },
  {
    id: 'strategy-rook-seventh',
    category: 'middlegame',
    title: '7번째 줄의 룩',
    level: 2,
    summary: '상대 진영 두 번째 줄에 들어간 룩은 폰을 쓸어 담아요.',
    steps: [
      {
        kind: 'explain',
        title: '돼지가 7번째 줄에',
        text: [
          '상대의 폰들은 처음에 7번째 줄(흑 기준 두 번째 줄)에 있어요. 내 룩이 그 줄에 들어가면 폰들을 옆에서 공격하고, 상대 킹을 맨 뒷줄에 가둬 놓을 수 있어요.',
          '두 룩이 모두 7번째 줄에 들어가면 메이트 위협까지 생겨요. 오픈 파일을 차지한 다음 목표가 바로 7번째 줄이에요.',
        ],
      },
      {
        kind: 'findMove',
        title: '7번째 줄로',
        fen: '6k1/pp3pp1/7p/8/8/8/5PPP/3R2K1 w - - 0 1',
        prompt: '룩을 흑 진영의 두 번째 줄로 보내세요.',
        solutions: [['Rd7']],
        hint: '열려 있는 d파일을 따라 쭉 올라가세요.',
        explanation: 'Rd7! 룩이 b7·f7 폰을 노리고, 흑 킹은 8번째 줄에 갇혀요.',
      },
    ],
  },
  {
    id: 'strategy-passed-pawn',
    category: 'middlegame',
    title: '패스트 폰',
    level: 2,
    summary: '막는 상대 폰이 없는 폰은 밀어야 해요.',
    steps: [
      {
        kind: 'explain',
        title: '앞을 막는 폰이 없다',
        text: [
          '자기 파일과 옆 파일 앞쪽에 상대 폰이 하나도 없는 폰을 "패스트 폰"이라고 해요. 상대 폰이 막을 수 없어서, 기물로 막지 않으면 결국 승격해요.',
          '"패스트 폰은 밀어야 한다"는 격언처럼, 앞으로 갈수록 상대는 기물 하나를 수비에 묶어 둬야 해요. 엔드게임에서는 특히 강력해요.',
        ],
        fen: '6k1/5ppp/8/1P6/8/8/5PPP/6K1 w - - 0 1',
        highlights: ['b5'],
        arrows: [{ from: 'b5', to: 'b8', tone: 'good' }],
      },
      {
        kind: 'findMove',
        title: '패스트 폰 밀기',
        fen: '6k1/5ppp/8/1P6/8/8/5PPP/6K1 w - - 0 1',
        prompt: '흑 킹은 너무 멀리 있어요. 패스트 폰을 승격 쪽으로 미세요.',
        solutions: [['b6']],
        hint: '사각형 규칙을 떠올려 보세요. 흑 킹이 따라잡을 수 있을까요?',
        explanation: 'b6! 흑 킹이 따라잡기 전에 폰이 먼저 승격해요.',
      },
    ],
  },
  {
    id: 'strategy-greek-gift',
    category: 'middlegame',
    title: '킹 공격: 그릭 기프트',
    level: 3,
    summary: 'h7에 비숍을 희생해 캐슬링한 킹을 무너뜨리는 고전 수법이에요.',
    steps: [
      {
        kind: 'explain',
        title: '조건이 맞으면 Bxh7+',
        text: [
          '흑이 킹 쪽으로 캐슬링했고, 백의 d3 비숍이 h7을 노리고, f3 나이트가 g5로 뛸 수 있고, 퀸이 h5로 갈 수 있으면 Bxh7+ 희생을 생각해 보세요.',
          '흐름은 Bxh7+ Kxh7 → Ng5+ (킹 체크) → Qh5 (h7 메이트 위협)예요. 흑에게 f6 나이트처럼 h7·h5를 지킬 기물이 없을 때 강력해요.',
          '조건 하나만 빠져도 비숍만 잃을 수 있으니, 수순을 끝까지 확인해야 해요.',
        ],
        fen: 'r1bq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 0 1',
        arrows: [
          { from: 'd3', to: 'h7', tone: 'good' },
          { from: 'f3', to: 'g5', tone: 'info' },
          { from: 'd1', to: 'h5', tone: 'info' },
        ],
      },
      {
        kind: 'findMove',
        title: '그릭 기프트 희생',
        fen: 'r1bq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 0 1',
        prompt: '비숍을 희생해서 흑 킹을 공격하세요. 이어지는 수까지 두세요.',
        solutions: [['Bxh7+', 'Kxh7', 'Ng5+', 'Kg8', 'Qh5']],
        hint: '첫 수는 h7 폰을 잡는 체크예요. 그다음 나이트와 퀸이 차례로 들어가요.',
        explanation:
          'Bxh7+ Kxh7 Ng5+ Kg8 Qh5! 이제 Qh7# 위협을 막기가 매우 어려워요. 흑에게 f6 나이트가 없는 것이 결정적이에요.',
      },
      {
        kind: 'puzzles',
        title: '실전 킹 공격',
        prompt: '희생으로 킹을 공격하는 실전 퍼즐이에요.',
        themes: ['kingsideAttack'],
        count: 4,
        maxRating: 1600,
      },
    ],
  },
];
