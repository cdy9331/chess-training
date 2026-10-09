import { useEffect, useState } from 'react';
import { parseOpeningData, type OpeningBook } from '../core/openings';

let bookPromise: Promise<OpeningBook> | null = null;

async function fetchJson(file: string, required: boolean): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/openings/${file}`);
  if (!response.ok) {
    if (required) throw new Error(`오프닝 데이터를 받지 못했어요 (${response.status})`);
    return null;
  }
  return response.json() as Promise<unknown>;
}

/**
 * 오프닝 이름 목록(openings.json, 필수)과 선택률 통계(stats.json, 선택)를
 * 처음 필요할 때 한 번만 받아온다.
 */
export function loadOpeningBook(): Promise<OpeningBook> {
  bookPromise ??= Promise.all([
    fetchJson('openings.json', true),
    fetchJson('stats.json', false).catch(() => null),
  ]).then(([raw, stats]) => {
    const book = parseOpeningData(raw, stats);
    if (!book) throw new Error('오프닝 데이터 형식이 올바르지 않아요.');
    return book;
  });
  bookPromise.catch(() => (bookPromise = null));
  return bookPromise;
}

/** 오프닝 데이터. 불러오는 중이거나 실패하면 null (오프닝 이름은 부가 정보라 조용히 넘어간다). */
export function useOpeningBook(): OpeningBook | null {
  const [book, setBook] = useState<OpeningBook | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadOpeningBook()
      .then((b) => !cancelled && setBook(b))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return book;
}
