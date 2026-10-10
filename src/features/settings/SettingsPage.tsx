import { useEffect, useRef, useState } from 'react';
import { DEFAULT_REVIEW_DEPTH } from '../../core/review';
import { backupRepo, isBackupFile, type BackupFile } from '../../db/repos/backup';
import { REVIEW_DEPTH_MAX, REVIEW_DEPTH_MIN, settingsRepo } from '../../db/repos/settings';
import { isMoveSoundEnabled, playMoveSound, setMoveSoundEnabled } from '../../shared/moveSounds';
import styles from './Settings.module.css';

type Message = { kind: 'ok' | 'error'; text: string } | null;
type Persist = 'unsupported' | 'persisted' | 'notPersisted';

const DEPTH_OPTIONS = Array.from(
  { length: REVIEW_DEPTH_MAX - REVIEW_DEPTH_MIN + 1 },
  (_, i) => REVIEW_DEPTH_MIN + i,
);

function depthHint(depth: number): string {
  if (depth <= 12) return '빠름 · 조금 덜 정확';
  if (depth <= 16) return '보통 (추천)';
  return '느림 · 더 정확';
}

function backupFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `chess-training-backup-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.json`;
}

function totalRows(file: BackupFile): number {
  return Object.values(file.tables).reduce((sum, rows) => sum + (rows?.length ?? 0), 0);
}

export function SettingsPage() {
  const [depth, setDepth] = useState<number | null>(null);
  const [persist, setPersist] = useState<Persist | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(isMoveSoundEnabled);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    settingsRepo
      .getReviewDepth()
      .then((d) => !cancelled && setDepth(d))
      .catch(() => !cancelled && setDepth(DEFAULT_REVIEW_DEPTH));
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (storage?.persisted) {
      storage
        .persisted()
        .then((p) => !cancelled && setPersist(p ? 'persisted' : 'notPersisted'))
        .catch(() => !cancelled && setPersist('unsupported'));
    } else {
      // effect 안에서 바로 setState하지 않도록 다음 틱에 반영한다
      void Promise.resolve().then(() => !cancelled && setPersist('unsupported'));
    }
    return () => {
      cancelled = true;
    };
  }, []);

  function changeSound(on: boolean) {
    setSound(on);
    setMoveSoundEnabled(on);
    if (on) playMoveSound('move');
    settingsRepo.setMoveSound(on).catch(() => undefined);
  }

  async function changeDepth(value: number) {
    setDepth(value);
    await settingsRepo.setReviewDepth(value);
    setMessage({
      kind: 'ok',
      text: `리뷰 분석 깊이를 ${value}(으)로 바꿨어요. 새로 리뷰하는 게임부터 적용돼요.`,
    });
  }

  async function requestPersist() {
    try {
      const granted = await navigator.storage.persist();
      setPersist(granted ? 'persisted' : 'notPersisted');
      setMessage(
        granted
          ? { kind: 'ok', text: '브라우저가 기록을 지우지 않도록 보호했어요.' }
          : {
              kind: 'error',
              text: '브라우저가 요청을 거절했어요. 백업 파일을 가끔 내보내 두세요.',
            },
      );
    } catch {
      setMessage({ kind: 'error', text: '이 브라우저는 저장소 보호를 지원하지 않아요.' });
    }
  }

  async function exportBackup() {
    setBusy(true);
    try {
      const now = new Date();
      const file = await backupRepo.exportAll(now);
      const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName(now);
      a.click();
      URL.revokeObjectURL(url);
      setMessage({
        kind: 'ok',
        text: `기록 ${totalRows(file).toLocaleString()}개를 파일로 내보냈어요.`,
      });
    } catch {
      setMessage({ kind: 'error', text: '내보내기에 실패했어요.' });
    } finally {
      setBusy(false);
    }
  }

  async function importBackup(file: File) {
    setBusy(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        parsed = null;
      }
      if (!isBackupFile(parsed)) {
        setMessage({ kind: 'error', text: '체스 트레이닝 백업 파일이 아니에요.' });
        return;
      }
      const ok = window.confirm(
        `지금 이 브라우저의 기록을 모두 지우고 백업(${parsed.exportedAt.slice(0, 10)})으로 바꿀까요?`,
      );
      if (!ok) return;
      await backupRepo.importAll(parsed);
      setMessage({ kind: 'ok', text: '백업을 가져왔어요. 화면을 새로 고칩니다…' });
      window.setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : '가져오기에 실패했어요.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function resetAll() {
    if (
      !window.confirm('대국·퍼즐·레슨·오프닝·실수 복습 기록을 모두 지울까요? 되돌릴 수 없어요.')
    ) {
      return;
    }
    if (!window.confirm('정말로 모두 지울까요? 먼저 백업을 내보내 두는 것을 추천해요.')) return;
    setBusy(true);
    try {
      await backupRepo.resetAll();
      setMessage({ kind: 'ok', text: '모든 기록을 지웠어요. 화면을 새로 고칩니다…' });
      window.setTimeout(() => window.location.reload(), 800);
    } catch {
      setMessage({ kind: 'error', text: '초기화에 실패했어요.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>설정</h1>

      {message && (
        <p className={message.kind === 'ok' ? styles.ok : styles.error} role="status">
          {message.text}
        </p>
      )}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>소리</h2>
        <label className={styles.row}>
          <input type="checkbox" checked={sound} onChange={(e) => changeSound(e.target.checked)} />
          착수 효과음
        </label>
        <p className={styles.small}>
          기물을 둘 때 "톡" 소리가 나요. 잡을 때는 더 묵직하게, 체크일 때는 "띵" 소리가 함께 나요.
        </p>
        <div className={styles.actions}>
          {(['move', 'capture', 'castle', 'check'] as const).map((kind) => (
            <button key={kind} type="button" disabled={!sound} onClick={() => playMoveSound(kind)}>
              🔊 {{ move: '착수', capture: '잡기', castle: '캐슬링', check: '체크' }[kind]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>게임 리뷰</h2>
        <label className={styles.row}>
          분석 깊이
          <select
            value={depth ?? DEFAULT_REVIEW_DEPTH}
            disabled={depth === null}
            onChange={(e) => void changeDepth(Number(e.target.value))}
          >
            {DEPTH_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} — {depthHint(d)}
              </option>
            ))}
          </select>
        </label>
        <p className={styles.small}>
          깊을수록 엔진이 더 멀리 내다봐서 정확하지만, 리뷰가 오래 걸려요. 이미 리뷰한 게임은 "다시
          분석"을 눌러야 바뀐 깊이로 분석해요.
        </p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>기록 백업</h2>
        <p className={styles.small}>
          모든 기록은 이 브라우저 안에만 저장돼요. 다른 컴퓨터·브라우저로 옮기거나 혹시 모를 삭제에
          대비하려면 파일로 내보내 두세요. (엔진 분석 캐시는 다시 만들 수 있어서 빠져요.)
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            disabled={busy}
            onClick={() => void exportBackup()}
          >
            ⬇ 내보내기 (JSON)
          </button>
          <button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>
            ⬆ 가져오기
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void importBackup(file);
            }}
          />
        </div>
        {persist && persist !== 'unsupported' && (
          <p className={styles.small}>
            {persist === 'persisted' ? (
              '🔒 브라우저가 공간이 부족해도 이 기록을 지우지 않도록 보호되어 있어요.'
            ) : (
              <>
                브라우저는 공간이 부족하면 기록을 지울 수 있어요.{' '}
                <button
                  type="button"
                  className={styles.inlineButton}
                  onClick={() => void requestPersist()}
                >
                  기록 보호 요청하기
                </button>
              </>
            )}
          </p>
        )}
      </div>

      <div className={`${styles.card} ${styles.danger}`}>
        <h2 className={styles.cardTitle}>전체 초기화</h2>
        <p className={styles.small}>대국·퍼즐·레슨·오프닝·실수 복습 기록을 모두 지워요.</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.dangerButton}
            disabled={busy}
            onClick={() => void resetAll()}
          >
            모든 기록 지우기
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>정보</h2>
        <p className={styles.small}>
          체스 엔진은 <a href="https://stockfishchess.org/">Stockfish</a>(GPLv3)를, 퍼즐과 오프닝
          데이터는 <a href="https://database.lichess.org/">Lichess</a>(CC0)를 사용해요. 이 앱을 공개
          배포할 때는 GPLv3에 따라 소스 코드를 함께 공개해야 해요.
        </p>
      </div>
    </section>
  );
}
