import { useEffect, useState } from 'react';
import type { Level } from './types/entry.ts';

/** 학년 설정. 뜻갈래 노출을 제어한다. 로컬에만 저장한다 (ADR-002). */
const GRADE_KEY = 'dict.gradeLevel';
const THEME_KEY = 'dict.theme';
/** '나중에'로 미룬 등급 개방 제안. 그 등급 이하 제안은 다시 띄우지 않는다. */
const UNLOCK_DISMISS_KEY = 'dict.unlockDismissed';

export const GRADE_LABELS: Record<Level, string> = {
  1: '3–4학년',
  2: '5학년',
  3: '6학년',
  4: '중학교',
};

function readGrade(): Level {
  const v = Number(localStorage.getItem(GRADE_KEY));
  return v === 2 || v === 3 || v === 4 ? v : 1;
}

export function useGrade(): [Level, (l: Level) => void] {
  const [grade, setGrade] = useState<Level>(readGrade);
  useEffect(() => {
    localStorage.setItem(GRADE_KEY, String(grade));
  }, [grade]);
  return [grade, setGrade];
}

/** 사용자가 '나중에'로 미룬 최고 등급(0=없음). */
export function readUnlockDismissed(): number {
  return Number(localStorage.getItem(UNLOCK_DISMISS_KEY)) || 0;
}
export function dismissUnlock(level: Level): void {
  if (level > readUnlockDismissed()) localStorage.setItem(UNLOCK_DISMISS_KEY, String(level));
}
export function clearUnlockDismissed(): void {
  localStorage.removeItem(UNLOCK_DISMISS_KEY);
}

export type Theme = 'light' | 'dark';

function readTheme(): Theme {
  const v = localStorage.getItem(THEME_KEY);
  if (v === 'light' || v === 'dark') return v;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}
