import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { importPgn, lineToPgn } from '../../core/chess';
import { gamesRepo } from '../../db/repos/games';
import styles from './Review.module.css';

/** 가져올 PGN 파일 크기 상한 (한 대국은 보통 수 KB) */
const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** 다른 사이트에서 둔 대국의 PGN을 붙여 넣거나 파일로 골라 리뷰한다. */
export function PgnImport() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [color, setColor] = useState<'w' | 'b'>('w');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => (text.trim() ? importPgn(text) : null), [text]);

  async function readFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setError('파일이 너무 커요. 대국 하나만 들어 있는 PGN을 골라 주세요.');
      return;
    }
    setError(null);
    setText(await file.text());
  }

  async function submit() {
    if (!parsed?.ok) return;
    const { game } = parsed;
    setSaving(true);
    try {
      const id = await gamesRepo.importGame({
        startFen: game.line.startFen,
        movesUci: game.line.moves.map((m) => m.uci),
        playerColor: color,
        result: game.result,
        endReason: game.endReason,
        pgn: lineToPgn(game.line, {
          White: game.white,
          Black: game.black,
          Result: game.result,
          ...(game.event ? { Event: game.event } : {}),
          ...(game.date ? { Date: game.date } : {}),
        }),
        importInfo: { white: game.white, black: game.black, event: game.event, date: game.date },
      });
      navigate(`/review/${id}`);
    } catch {
      setError('대국을 저장하지 못했어요.');
      setSaving(false);
    }
  }

  return (
    <details className={styles.importBox}>
      <summary>📥 PGN으로 대국 가져오기</summary>
      <p className={styles.muted}>
        chess.com이나 Lichess의 대국 화면에서 "PGN 복사/다운로드"로 받은 기록을 붙여 넣으세요.
      </p>
      <textarea
        className={styles.pgnInput}
        rows={6}
        value={text}
        placeholder={'[Event "..."]\n\n1. e4 e5 2. Nf3 Nc6 ...'}
        aria-label="PGN"
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
      />
      <div className={styles.importRow}>
        <label>
          파일에서 열기{' '}
          <input
            type="file"
            accept=".pgn,text/plain,application/x-chess-pgn"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void readFile(file);
            }}
          />
        </label>
      </div>

      {parsed && !parsed.ok && <p className={styles.error}>{parsed.error}</p>}
      {error && <p className={styles.error}>{error}</p>}
      {parsed?.ok && (
        <div className={styles.importRow}>
          <span>
            <strong>
              {parsed.game.white} vs {parsed.game.black}
            </strong>{' '}
            · {Math.ceil(parsed.game.line.moves.length / 2)}수 · 결과 {parsed.game.result}
          </span>
          <span>
            나는{' '}
            <label>
              <input
                type="radio"
                name="pgn-color"
                checked={color === 'w'}
                onChange={() => setColor('w')}
              />
              백({parsed.game.white})
            </label>{' '}
            <label>
              <input
                type="radio"
                name="pgn-color"
                checked={color === 'b'}
                onChange={() => setColor('b')}
              />
              흑({parsed.game.black})
            </label>
          </span>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={saving}
            onClick={() => void submit()}
          >
            가져와서 리뷰하기
          </button>
        </div>
      )}
    </details>
  );
}
