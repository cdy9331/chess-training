import type { MoveSoundKind } from '../core/chess';

/**
 * 착수 효과음. 음원 파일(저작권·용량) 없이 Web Audio로 나무 기물이 "톡" 놓이는 소리를 합성한다:
 * 짧은 잡음을 대역 통과 필터로 깎아 "딸깍"을 만들고, 낮은 사인파로 "툭" 하는 울림을 더한다.
 */

let enabled = true;
let context: AudioContext | null = null;

export function setMoveSoundEnabled(value: boolean): void {
  enabled = value;
}

export function isMoveSoundEnabled(): boolean {
  return enabled;
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;
  context ??= new AudioContext();
  // 브라우저는 사용자가 한 번 클릭하기 전까지 소리를 막는다 → 클릭 뒤에는 resume으로 풀린다
  if (context.state === 'suspended') void context.resume();
  return context;
}

interface Tock {
  /** 시작 시각(초, 현재 기준) */
  at: number;
  /** 딸깍 소리의 중심 주파수 (낮을수록 묵직) */
  clickHz: number;
  /** 울림 주파수 */
  bodyHz: number;
  gain: number;
  /** 소리 길이(초) */
  length: number;
}

function playTock(ctx: AudioContext, { at, clickHz, bodyHz, gain, length }: Tock) {
  const start = ctx.currentTime + at;

  // 딸깍: 짧은 잡음 + 대역 통과 필터
  const frames = Math.ceil(ctx.sampleRate * length);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = clickHz;
  filter.Q.value = 1.2;
  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(gain, start);
  clickGain.gain.exponentialRampToValueAtTime(0.001, start + length);
  noise.connect(filter).connect(clickGain).connect(ctx.destination);
  noise.start(start);
  noise.stop(start + length);

  // 툭: 빠르게 낮아지며 사라지는 사인파
  const body = ctx.createOscillator();
  body.type = 'sine';
  body.frequency.setValueAtTime(bodyHz, start);
  body.frequency.exponentialRampToValueAtTime(bodyHz * 0.6, start + length);
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(gain * 0.8, start);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, start + length * 1.4);
  body.connect(bodyGain).connect(ctx.destination);
  body.start(start);
  body.stop(start + length * 1.4);
}

function playPing(ctx: AudioContext, at: number) {
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = 880;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + 0.2);
}

const MOVE: Tock = { at: 0, clickHz: 2000, bodyHz: 220, gain: 0.5, length: 0.07 };
const CAPTURE: Tock = { at: 0, clickHz: 1300, bodyHz: 160, gain: 0.8, length: 0.1 };

export function playMoveSound(kind: MoveSoundKind): void {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;
  try {
    switch (kind) {
      case 'move':
        playTock(ctx, MOVE);
        break;
      case 'capture':
        playTock(ctx, CAPTURE);
        playTock(ctx, { ...MOVE, at: 0.025, gain: 0.3 });
        break;
      case 'castle':
        // 킹과 룩이 차례로 놓이는 두 번의 착수
        playTock(ctx, MOVE);
        playTock(ctx, { ...MOVE, at: 0.11 });
        break;
      case 'check':
        playTock(ctx, MOVE);
        playPing(ctx, 0.04);
        break;
    }
  } catch {
    // 소리는 부가 기능이라 실패해도 무시한다
  }
}
