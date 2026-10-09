/**
 * 오프닝 이름(영어)의 대표 이름(콜론 앞)을 한국어로. 세부 변화(콜론 뒤)는 영어 그대로 둔다.
 * 초보자가 자주 만나는 오프닝 위주로 담았다.
 */
const FAMILY_KO: Record<string, string> = {
  'Italian Game': '이탈리안 게임',
  'Ruy Lopez': '루이 로페즈 (스패니시)',
  'Scotch Game': '스카치 게임',
  'Four Knights Game': '포 나이츠 게임',
  'Three Knights Opening': '스리 나이츠 오프닝',
  "King's Pawn Game": '킹스 폰 게임',
  "King's Knight Opening": '킹스 나이트 오프닝',
  "King's Gambit": '킹스 갬빗',
  "King's Gambit Accepted": '킹스 갬빗 수락',
  "King's Gambit Declined": '킹스 갬빗 거절',
  'Vienna Game': '비엔나 게임',
  "Bishop's Opening": '비숍스 오프닝',
  "Petrov's Defense": '페트로프 디펜스',
  'Philidor Defense': '필리도어 디펜스',
  'Two Knights Defense': '투 나이츠 디펜스',
  'Sicilian Defense': '시실리안 디펜스',
  'French Defense': '프렌치 디펜스',
  'Caro-Kann Defense': '카로칸 디펜스',
  'Scandinavian Defense': '스칸디나비안 디펜스',
  'Pirc Defense': '피르츠 디펜스',
  'Modern Defense': '모던 디펜스',
  'Alekhine Defense': '알레힌 디펜스',
  'Owen Defense': '오웬 디펜스',
  'Nimzowitsch Defense': '님초비치 디펜스',
  "Queen's Pawn Game": '퀸스 폰 게임',
  "Queen's Gambit Declined": '퀸스 갬빗 거절',
  "Queen's Gambit Accepted": '퀸스 갬빗 수락',
  "Queen's Gambit": '퀸스 갬빗',
  'Slav Defense': '슬라브 디펜스',
  'Semi-Slav Defense': '세미 슬라브 디펜스',
  'London System': '런던 시스템',
  'Colle System': '콜레 시스템',
  'Trompowsky Attack': '트롬포프스키 어택',
  'Indian Defense': '인디언 디펜스',
  "King's Indian Defense": '킹스 인디언 디펜스',
  "King's Indian Attack": '킹스 인디언 어택',
  "Queen's Indian Defense": '퀸스 인디언 디펜스',
  'Nimzo-Indian Defense': '님조 인디언 디펜스',
  'Grünfeld Defense': '그륀펠트 디펜스',
  'Benoni Defense': '베노니 디펜스',
  'Dutch Defense': '더치 디펜스',
  'Catalan Opening': '카탈란 오프닝',
  'English Opening': '잉글리시 오프닝',
  'Réti Opening': '레티 오프닝',
  'Zukertort Opening': '추커토르트 오프닝',
  'Bird Opening': '버드 오프닝',
  'Englund Gambit': '잉글룬드 갬빗',
  'Blackmar-Diemer Gambit': '블랙마-디머 갬빗',
  'Center Game': '센터 게임',
  'Danish Gambit': '대니시 갬빗',
  'Elephant Gambit': '엘리펀트 갬빗',
  'Latvian Gambit': '라트비안 갬빗',
  'Van Geet Opening': '반 헤이트 오프닝',
  'Hungarian Opening': '헝가리안 오프닝',
  'Polish Opening': '폴리시 오프닝',
};

/** "Italian Game: Two Knights Defense" → { family: "이탈리안 게임", detail: "Two Knights Defense" } */
export function koreanOpeningName(name: string): { family: string; detail: string | null } {
  const [familyEn = name, ...rest] = name.split(': ');
  const detail = rest.length > 0 ? rest.join(': ') : null;
  return { family: FAMILY_KO[familyEn] ?? familyEn, detail };
}

/** 한 줄 표시용: "이탈리안 게임 · Two Knights Defense" */
export function formatOpeningName(name: string): string {
  const { family, detail } = koreanOpeningName(name);
  return detail ? `${family} · ${detail}` : family;
}
