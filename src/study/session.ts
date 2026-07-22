/**
 * 하루 세션 구성 — 순수 함수. docs/02-learning-design.md 세션 설계·전이표.
 *
 * 신규 최대 5 + 복습 최대 15. 신규를 먼저, 복습을 뒤에.
 * '신규'는 아직 답한 적 없는 카드(attempts 0), '복습'은 답한 적 있고 오늘 due인 카드.
 */

import type {
  Collocation, Entry, Level, Sense, StudyRecord, StudyTarget,
} from '../types/entry.ts';
import { indexRecords, isDue, targetKey } from './schedule.ts';

export const NEW_PER_DAY = 5;
export const REVIEW_PER_DAY = 15;

/** 학습 단위 하나. 뜻갈래 또는 연어. */
export interface StudyUnit {
  target: StudyTarget;
  entry: Entry;
  sense: Sense;
  /** 연어 카드일 때만 */
  collocation?: Collocation;
  level: Level;
}

export interface SessionCard extends StudyUnit {
  record: StudyRecord | null;
  isNew: boolean;
}

export interface Session {
  cards: SessionCard[];
  counts: { new: number; review: number; dueRemaining: number };
}

/** 현재 학년에서 학습 가능한 모든 단위를 entries 순서대로. */
export function studiableUnits(entries: Entry[], grade: Level): StudyUnit[] {
  const units: StudyUnit[] = [];
  for (const entry of entries) {
    for (const sense of entry.senses) {
      if (sense.level > grade) continue;
      units.push({ target: { type: 'sense', id: sense.id }, entry, sense, level: sense.level });
      for (const c of sense.collocations ?? []) {
        if (c.studiable && c.level <= grade) {
          units.push({
            target: { type: 'collocation', id: c.id },
            entry, sense, collocation: c, level: c.level,
          });
        }
      }
    }
  }
  return units;
}

export interface BuildOptions {
  newPerDay?: number;
  reviewPerDay?: number;
}

export function buildSession(
  entries: Entry[],
  records: StudyRecord[],
  grade: Level,
  day: string,
  opts: BuildOptions = {},
): Session {
  const newCap = opts.newPerDay ?? NEW_PER_DAY;
  const reviewCap = opts.reviewPerDay ?? REVIEW_PER_DAY;

  const units = studiableUnits(entries, grade);
  const unitByKey = new Map(units.map((u) => [targetKey(u.target), u]));
  const byTarget = indexRecords(records);

  // 복습: 답한 적 있고 오늘 due이며 현재 학년 범위 안. 박스 낮은 순 → dueOn 오래된 순.
  const dueReviews: SessionCard[] = [];
  for (const rec of records) {
    if (rec.attempts === 0) continue;
    if (!isDue(rec, day)) continue;
    const unit = unitByKey.get(targetKey(rec.target));
    if (!unit) continue; // 학년 밖이거나 삭제된 뜻갈래 → 스케줄에서 제외 (기록은 보존)
    dueReviews.push({ ...unit, record: rec, isNew: false });
  }
  dueReviews.sort((a, b) =>
    a.record!.box - b.record!.box || a.record!.dueOn.localeCompare(b.record!.dueOn));
  const review = dueReviews.slice(0, reviewCap);

  // 신규: ① 검색으로 자동 등록됐지만 아직 답 안 한 카드(attempts 0) 우선
  const newFromRecords: SessionCard[] = [];
  for (const rec of records) {
    if (rec.attempts !== 0) continue;
    const unit = unitByKey.get(targetKey(rec.target));
    if (!unit) continue;
    newFromRecords.push({ ...unit, record: rec, isNew: true });
  }
  // ② 부족하면 교육과정 순서(entries 순)로 아직 기록이 없는 단위
  const newFromCurriculum: SessionCard[] = [];
  for (const unit of units) {
    if (newFromRecords.length + newFromCurriculum.length >= newCap) break;
    if (byTarget.has(targetKey(unit.target))) continue;
    newFromCurriculum.push({ ...unit, record: null, isNew: true });
  }
  const newCards = [...newFromRecords, ...newFromCurriculum].slice(0, newCap);

  return {
    cards: [...newCards, ...review],
    counts: {
      new: newCards.length,
      review: review.length,
      dueRemaining: Math.max(0, dueReviews.length - review.length),
    },
  };
}

/** 통계: 익힌 단어 수, 4번 박스 첫 복습 정답률 (docs/02 유지율). */
export interface Stats {
  mastered: number;
  learning: number;
  box4FirstReviewRate: number | null;
  box4Samples: number;
}

export function stats(records: StudyRecord[]): Stats {
  const mastered = records.filter((r) => r.masteredOn !== null).length;
  const learning = records.filter((r) => r.masteredOn === null && r.attempts > 0).length;
  // 4번 박스 첫 복습 = box가 4에 도달한 뒤 처음 답한 것. 근사: 현재 box>=4 도달 경험이 있는
  // 카드의 정답률을 볼 수는 없으므로, box4 이상에 있는 카드들의 누적 정답률로 대신한다.
  const box4 = records.filter((r) => r.box >= 4 && r.attempts > 0);
  const totalAtt = box4.reduce((s, r) => s + r.attempts, 0);
  const totalCor = box4.reduce((s, r) => s + r.correct, 0);
  return {
    mastered,
    learning,
    box4Samples: box4.length,
    box4FirstReviewRate: totalAtt > 0 ? totalCor / totalAtt : null,
  };
}
