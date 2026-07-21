import { useEffect, useState } from 'react';
import type { Level } from './types/entry.ts';

/** 학년 설정. 뜻갈래 노출을 제어한다. 로컬에만 저장한다 (ADR-002). */
const GRADE_KEY = 'dict.gradeLevel';
const THEME_KEY = 'dict.theme';

export const GRADE_LABELS: Record<Level, string> = {
  1: '3–4학년',
  2: '5학년',
  3: '6학년',
};

function readGrade(): Level {
  const v = Number(localStorage.getItem(GRADE_KEY));
  return v === 2 || v === 3 ? v : 1;
}

export function useGrade(): [Level, (l: Level) => void] {
  const [grade, setGrade] = useState<Level>(readGrade);
  useEffect(() => {
    localStorage.setItem(GRADE_KEY, String(grade));
  }, [grade]);
  return [grade, setGrade];
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
