/**
 * Leitner 5박스 스케줄러 — 순수 함수. IndexedDB·React와 분리해 node로 테스트한다.
 * 규칙: docs/02-learning-design.md 상태 전이표.
 */

import type { LeitnerBox, StudyRecord, StudyTarget } from '../types/entry.ts';

/** 박스별 다음 복습까지 일수. box 1 = 1일 뒤. */
export const BOX_DAYS: Record<LeitnerBox, number> = {
  1: 1, 2: 3, 3: 7, 4: 16, 5: 35,
};

export const MAX_BOX: LeitnerBox = 5;

/** 로컬 자정 기준 'YYYY-MM-DD' (ADR-007). 시각이 아니라 날짜다. */
export function today(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** date 문자열에 days를 더한 'YYYY-MM-DD'. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return today(dt);
}

function targetKey(t: StudyTarget): string {
  return `${t.type}:${t.id}`;
}

export function sameTarget(a: StudyTarget, b: StudyTarget): boolean {
  return a.type === b.type && a.id === b.id;
}

/** 처음 만드는 카드. box 1, 오늘 due. */
export function newRecord(target: StudyTarget, day: string): StudyRecord {
  return {
    target,
    box: 1,
    dueOn: day,
    lastAnsweredAt: null,
    attempts: 0,
    correct: 0,
    masteredOn: null,
  };
}

/**
 * 답변 반영. 맞으면 한 칸 위·다음 간격, 틀리면 box 1·오늘.
 * box 5 정답이면 '익힘'(masteredOn) 처리.
 */
export function applyAnswer(
  rec: StudyRecord,
  correct: boolean,
  day: string,
  now: Date = new Date(),
): StudyRecord {
  const attempts = rec.attempts + 1;
  const correctCount = rec.correct + (correct ? 1 : 0);
  const lastAnsweredAt = now.toISOString();

  if (!correct) {
    return { ...rec, box: 1, dueOn: day, attempts, correct: correctCount, lastAnsweredAt };
  }

  const box = Math.min(rec.box + 1, MAX_BOX) as LeitnerBox;
  const mastered = rec.box === MAX_BOX;
  return {
    ...rec,
    box,
    dueOn: addDays(day, BOX_DAYS[box]),
    attempts,
    correct: correctCount,
    lastAnsweredAt,
    masteredOn: mastered ? day : rec.masteredOn,
  };
}

/** 오늘 복습 대상인가. 익힘 카드는 제외. */
export function isDue(rec: StudyRecord, day: string): boolean {
  return rec.masteredOn === null && rec.dueOn <= day;
}

/** 기록 목록을 target 기준으로 찾기 쉽게 Map으로. */
export function indexRecords(records: StudyRecord[]): Map<string, StudyRecord> {
  return new Map(records.map((r) => [targetKey(r.target), r]));
}

export { targetKey };
