import openingsJson from '../../../public/data/openings/openings.json?raw';
import { fenToEpd } from '../../core/chess';
import { parseOpeningData, resolveLine } from '../../core/openings';
import { REPERTOIRE } from './repertoire';

// 테스트에서만 빌드된 데이터를 직접 읽는다 (앱은 fetch로 지연 로딩)
const book = parseOpeningData(JSON.parse(openingsJson));

describe('오프닝 레퍼토리 콘텐츠', () => {
  it('ID가 겹치지 않는다', () => {
    const ids = REPERTOIRE.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(REPERTOIRE.map((l) => [l.id, l] as const))('%s: 모든 수가 합법이다', (_, line) => {
    expect(() => resolveLine(line)).not.toThrow();
  });

  it.each(REPERTOIRE.map((l) => [l.id, l] as const))(
    '%s: 사용자가 두는 수에는 설명이 있다',
    (_, line) => {
      for (const move of resolveLine(line).filter((m) => m.mine)) {
        expect(move.comment, `${line.id} ${move.san}`).toBeTruthy();
      }
    },
  );

  // Lichess 데이터는 "이름 붙이기"용 목록이라 정석 수순의 모든 국면을 담고 있지는 않다.
  // 그래서 첫 3 ply가 데이터 안에 있고, 라인 중에 이름이 붙은 오프닝이 확인되는지만 본다.
  it.each(REPERTOIRE.map((l) => [l.id, l] as const))(
    '%s: Lichess 오프닝 데이터로 이름이 확인된다',
    (_, line) => {
      expect(book).not.toBeNull();
      if (!book) return;
      const moves = resolveLine(line);
      for (const move of moves.slice(0, 3)) {
        expect(book.has(fenToEpd(move.fenAfter)), `${line.id} ${move.san}`).toBe(true);
      }
      expect(moves.some((m) => book.get(fenToEpd(m.fenAfter)))).toBe(true);
    },
  );
});
