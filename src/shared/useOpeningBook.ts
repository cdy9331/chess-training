import { useEffect, useState } from 'react';
import { parseOpeningData, type OpeningBook } from '../core/openings';

let bookPromise: Promise<OpeningBook> | null = null;

/** public/data/openings/openings.json (약 700KB)을 처음 필요할 때 한 번만 받아온다. */
export function loadOpeningBook(): Promise<OpeningBook> {
  bookPromise ??= fetch(`${import.meta.env.BASE_URL}data/openings/openings.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`오프닝 데이터를 받지 못했어요 (${r.status})`);
      return r.json() as Promise<unknown>;
    })
    .then((raw) => {
      const book = parseOpeningData(raw);
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
