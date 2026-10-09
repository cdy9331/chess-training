import type { Lesson } from '../../core/lessons/types';

export const ENDGAME_LESSONS: readonly Lesson[] = [
  {
    id: 'endgame-stalemate',
    category: 'endgame',
    title: '스테일메이트 조심',
    level: 1,
    summary: '이긴 게임을 무승부로 만드는 가장 흔한 실수를 피해요.',
    steps: [
      {
        kind: 'explain',
        title: '둘 곳이 없는데 체크가 아니면',
        text: [
          '둘 차례인 쪽이 합법적인 수가 하나도 없는데 체크를 당하고 있지 않으면 "스테일메이트"로 무승부예요.',
          '아래 국면에서 흑 차례예요. 흑 킹은 g8·g7·h7 모두 백 퀸과 킹이 막고 있어서 움직일 수 없지만, 체크는 아니에요. 퀸이 하나 더 있어도 무승부가 돼요!',
          '많이 이기고 있을 때는 상대 킹이 움직일 칸이 남아 있는지 수마다 확인하세요.',
        ],
        fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
        highlights: ['h8'],
      },
      {
        kind: 'findMove',
        title: '스테일메이트 말고 메이트',
        fen: '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1',
        prompt: '서두르면 스테일메이트가 될 수 있어요. 정확하게 메이트하세요.',
        solutions: [['Qb8#']],
        hint: '8번째 줄 전체를 퀸으로 막으면서 체크하세요.',
        explanation: 'Qb8#! 체크를 하면서 메이트해야 해요. 체크 없이 갇히면 스테일메이트예요.',
      },
    ],
  },
  {
    id: 'endgame-opposition',
    category: 'endgame',
    title: '오포지션',
    level: 2,
    summary: '킹끼리 마주 보는 싸움. 폰 엔드게임의 승패를 가르는 열쇠예요.',
    steps: [
      {
        kind: 'explain',
        title: '킹끼리 마주 보기',
        text: [
          '두 킹이 한 칸 띄고 마주 볼 때, 상대가 둘 차례라면 "내가 오포지션을 가졌다"고 해요. 상대 킹은 물러나야 하고, 내 킹이 앞으로 나갈 수 있어요.',
          '킹+폰 대 킹 엔드게임에서 내 킹이 폰보다 앞(6번째 줄)에 있으면 거의 항상 이겨요. 킹이 폰의 길을 열어 주거든요.',
        ],
        fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
        highlights: ['e6', 'e8'],
      },
      {
        kind: 'playOut',
        title: '폰 승격시키기',
        fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
        prompt: '엔진(흑)이 막아요. 10수 안에 폰을 승격시키세요.',
        goal: 'promote',
        maxMoves: 10,
        tips: [
          '킹을 옆으로(d6이나 f6) 옮겨 폰이 나갈 길을 지켜요.',
          '폰보다 킹이 먼저! 킹이 승격할 칸 근처를 지키게 하세요.',
        ],
      },
    ],
  },
  {
    id: 'endgame-square-rule',
    category: 'endgame',
    title: '사각형 규칙',
    level: 1,
    summary: '상대 킹이 내 폰을 따라잡을 수 있는지 한눈에 판단해요.',
    steps: [
      {
        kind: 'explain',
        title: '폰의 사각형',
        text: [
          '폰에서 승격 칸까지를 한 변으로 하는 정사각형을 그려 보세요. 상대 킹이 (상대 차례에) 이 사각형 안으로 들어올 수 있으면 폰을 따라잡고, 못 들어오면 폰은 혼자 승격해요.',
          '아래 국면에서 a5 폰의 사각형은 a5–a8–d8–d5예요. 흑 킹(g2)은 한 번에 이 안에 들어올 수 없어요. 그러니 폰을 밀기만 하면 돼요!',
        ],
        fen: '8/8/8/P7/8/8/6k1/K7 w - - 0 1',
        highlights: ['a5', 'a8', 'd8', 'd5'],
      },
      {
        kind: 'playOut',
        title: '폰 경주',
        fen: '8/8/8/P7/8/8/6k1/K7 w - - 0 1',
        prompt: '흑 킹이 따라잡기 전에 폰을 승격시키세요.',
        goal: 'promote',
        maxMoves: 5,
        tips: ['킹은 필요 없어요. 폰만 앞으로!'],
      },
    ],
  },
  {
    id: 'endgame-spare-tempo',
    category: 'endgame',
    title: '여분의 수(템포)',
    level: 3,
    summary: '폰 한 칸으로 차례를 넘겨 오포지션을 되찾아요.',
    steps: [
      {
        kind: 'explain',
        title: '차례를 넘기는 수',
        text: [
          '킹이 마주 보고 있는데 내 차례라면 오포지션은 상대에게 있어요. 이때 폰을 한 칸만 밀면 차례가 상대에게 넘어가서 내가 오포지션을 갖게 돼요.',
          '그래서 폰은 너무 빨리 밀지 말고, 킹이 앞장서게 한 뒤 필요할 때 "여분의 수"로 쓰세요. 킹이 폰보다 두 줄 앞에 있으면 이 방법으로 이길 수 있어요.',
        ],
        fen: '8/8/3k4/8/3K4/8/3P4/8 w - - 0 1',
        highlights: ['d4', 'd6'],
        arrows: [{ from: 'd2', to: 'd3', tone: 'good' }],
      },
      {
        kind: 'playOut',
        title: '여분의 수로 이기기',
        fen: '8/8/3k4/8/3K4/8/3P4/8 w - - 0 1',
        prompt: '엔진(흑)이 막아요. 20수 안에 폰을 승격시키세요.',
        goal: 'promote',
        maxMoves: 20,
        tips: [
          '먼저 폰을 d3로 한 칸 밀어 차례를 넘겨요.',
          '흑 킹이 비키면 내 킹을 앞으로(옆쪽으로 돌아) 보내 폰의 길을 열어요.',
        ],
      },
    ],
  },
  {
    id: 'endgame-key-squares',
    category: 'endgame',
    title: '핵심 칸',
    level: 2,
    summary: '킹이 이 칸에 도착하면 폰은 반드시 승격해요.',
    steps: [
      {
        kind: 'explain',
        title: '폰 앞 두 줄의 세 칸',
        text: [
          '킹+폰 대 킹에서, 폰(가장자리 폰 제외) 앞 두 줄에 있는 세 칸을 "핵심 칸"이라고 해요. 내 킹이 이 중 한 칸에 도착하면 상대가 어떻게 막아도 폰은 승격해요.',
          '아래 국면에서 e2 폰의 핵심 칸은 d4·e4·f4예요. 백 킹(e3)은 한 수면 핵심 칸에 들어가요.',
          '폰을 서둘러 밀지 말고, 킹을 먼저 핵심 칸으로 보내세요.',
        ],
        fen: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1',
        highlights: ['d4', 'e4', 'f4'],
      },
      {
        kind: 'playOut',
        title: '핵심 칸으로 이기기',
        fen: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1',
        prompt: '엔진(흑)이 막아요. 25수 안에 폰을 승격시키세요.',
        goal: 'promote',
        maxMoves: 25,
        tips: [
          '킹을 먼저 d4·e4·f4 중 하나로 보내요.',
          '킹이 폰보다 앞에 있게 하고, 오포지션을 잃지 않게 조심해요.',
        ],
      },
      {
        kind: 'puzzles',
        title: '실전 폰 엔드게임',
        prompt: '킹과 폰만 남은 실전 퍼즐이에요.',
        themes: ['pawnEndgame'],
        count: 4,
        maxRating: 1600,
      },
    ],
  },
  {
    id: 'endgame-rook-behind-passer',
    category: 'endgame',
    title: '룩은 패스트 폰 뒤에',
    level: 2,
    summary: '룩 엔드게임에서 가장 중요한 원칙(타라시 규칙)이에요.',
    steps: [
      {
        kind: 'explain',
        title: '뒤에서 밀어 주기',
        text: [
          '룩은 패스트 폰의 "뒤"에 두는 게 가장 좋아요. 내 폰 뒤에 있으면 폰이 나갈수록 룩이 지키는 범위가 넓어지고, 상대 폰 뒤에 있으면 그 폰이 나갈수록 상대 룩이 수동적이 돼요.',
          '폰 앞에 있는 룩은 폰이 나갈수록 움직일 공간이 줄어들어요.',
        ],
      },
      {
        kind: 'findMove',
        title: '룩을 폰 뒤로',
        fen: 'r5k1/8/8/P7/8/8/6K1/7R w - - 0 1',
        prompt: 'a5 패스트 폰을 지키면서 밀 수 있도록 룩을 옮기세요.',
        solutions: [['Ra1']],
        hint: '룩을 폰과 같은 파일, 폰의 뒤쪽에 두세요.',
        explanation: 'Ra1! 이제 폰이 a6·a7로 나가도 룩이 계속 뒤에서 지켜 줘요.',
      },
      {
        kind: 'puzzles',
        title: '실전 룩 엔드게임',
        prompt: '룩 엔드게임 실전 퍼즐이에요.',
        themes: ['rookEndgame'],
        count: 4,
        maxRating: 1600,
      },
    ],
  },
  {
    id: 'endgame-lucena',
    category: 'endgame',
    title: '루세나 포지션',
    level: 3,
    summary: '룩+폰으로 이기는 기본 국면: "다리 놓기".',
    steps: [
      {
        kind: 'explain',
        title: '다리 놓기',
        text: [
          '내 킹이 승격 칸 앞에 있고 폰이 7번째 줄에 있는데, 상대 룩이 옆에서 계속 체크해 킹이 나올 수 없는 국면이에요.',
          '방법: ① 룩으로 체크해 상대 킹을 한 칸 더 밀어내고, ② 룩을 4번째 줄로 옮겨 "다리"를 준비하고, ③ 킹이 나와서 체크를 받으면 그 룩으로 체크를 막아요.',
        ],
        fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
      },
      {
        kind: 'findMove',
        title: '다리 준비',
        fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
        prompt: '먼저 룩으로 흑 킹을 밀어내고, 그다음 룩을 4번째 줄로 옮겨 다리를 준비하세요.',
        solutions: [['Rd1+', 'Ke7', 'Rd4']],
        hint: '첫 수는 d파일로 체크예요.',
        explanation:
          'Rd1+ Ke7 Rd4! 이제 백 킹이 c7·b6 쪽으로 나오다가 체크를 받으면 Rc4나 Rb4 같은 수로 룩이 체크를 막아요. 이것이 "다리"예요.',
      },
    ],
  },
  {
    id: 'endgame-philidor',
    category: 'endgame',
    title: '필리도어 포지션',
    level: 3,
    summary: '룩 엔드게임에서 폰 하나 적어도 비기는 수비법이에요.',
    steps: [
      {
        kind: 'explain',
        title: '세 번째 줄 방어',
        text: [
          '내 킹이 상대 폰 앞(승격 칸)에 있다면, 룩을 내 쪽에서 세 번째 줄(흑이면 6번째 줄)에 두고 상대 킹이 넘어오지 못하게 막아요.',
          '상대가 폰을 그 줄까지 밀면, 그때 룩을 맨 뒤로 보내 뒤에서 계속 체크해요. 킹이 숨을 곳이 없어 무승부가 돼요.',
        ],
        fen: '4k3/R7/8/3KP3/8/8/8/1r6 b - - 0 1',
        highlights: ['b6'],
      },
      {
        kind: 'findMove',
        title: '세 번째 줄로',
        fen: '4k3/R7/8/3KP3/8/8/8/1r6 b - - 0 1',
        prompt: '흑으로 둬요. 룩으로 백 킹이 6번째 줄로 들어오지 못하게 막으세요.',
        solutions: [['Rb6']],
        hint: '룩을 6번째 줄로 올리세요.',
        explanation:
          'Rb6! 백 킹은 6번째 줄로 들어올 수 없어요. 백이 e6을 두면 그때 Rb1로 내려가 뒤에서 계속 체크하면 비겨요.',
      },
    ],
  },
];
