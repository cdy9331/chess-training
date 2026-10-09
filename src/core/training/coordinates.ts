/** 좌표 훈련: 제한 시간 안에 화면에 나온 칸 이름(e4 등)을 체스판에서 찾아 누른다. */

export const COORDINATE_ROUND_MS = 30_000;

const FILES = 'abcdefgh';

export function allSquares(): string[] {
  const squares: string[] = [];
  for (const file of FILES) for (let rank = 1; rank <= 8; rank++) squares.push(`${file}${rank}`);
  return squares;
}

/** 다음 문제 칸. 같은 칸이 연달아 나오지 않게 한다. */
export function nextSquare(random: () => number, previous: string | null): string {
  const squares = allSquares().filter((s) => s !== previous);
  return squares[Math.floor(random() * squares.length)] ?? 'e4';
}

/** 칸 색 (초보자 힌트용): a1은 어두운 칸 */
export function isLightSquare(square: string): boolean {
  const file = FILES.indexOf(square[0] ?? '');
  const rank = Number(square[1]);
  return (file + rank) % 2 === 0;
}
