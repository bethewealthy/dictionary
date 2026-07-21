import type { Entry, Level } from '../types/entry.ts';

/**
 * 검색 — 1,000개 규모에서는 라이브러리 없이 선형 탐색으로 충분하다 (ADR-003).
 * 필요한 건 인덱스가 아니라 오타 관용(`elefant` → `elephant`)이고,
 * 그건 편집거리 계산의 문제다.
 *
 * 영어 표제어와 한국어 대응어를 모두 검색한다 — 아이가 '고양이'로도 찾을 수 있어야 한다.
 */

export interface SearchResult {
  entry: Entry;
  /** 낮을수록 좋은 일치. 정렬 키. */
  score: number;
}

/** 편집거리 ≤ max 면 그 값을, 아니면 max+1을 반환한다 (조기 종료). */
function boundedLevenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      curr.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = curr;
  }
  return prev[b.length];
}

const norm = (s: string) => s.toLowerCase().trim();

/** 한 표제어에 대한 최적 점수. 일치하지 않으면 null. */
function scoreEntry(entry: Entry, q: string): number | null {
  const head = norm(entry.headword);

  if (head === q) return 0;
  if (head.startsWith(q)) return 1;
  if (head.includes(q)) return 2;

  // 굴절형도 접두 일치를 본다 (ran → run은 못 잡지만 running → run은 표기가 다르므로 생략)
  // 한국어 대응어 일치
  for (const s of entry.senses) {
    const ko = s.ko;
    if (ko === q) return 1.5;
    if (ko.includes(q)) return 2.5;
  }

  // 오타 관용 — 짧은 질의에는 관대하게, 긴 질의에는 엄격하게
  const maxDist = q.length <= 4 ? 1 : 2;
  const dist = boundedLevenshtein(head, q, maxDist);
  if (dist <= maxDist) return 3 + dist;

  return null;
}

export function search(all: Entry[], query: string): SearchResult[] {
  const q = norm(query);
  if (!q) return [];

  const results: SearchResult[] = [];
  for (const entry of all) {
    const score = scoreEntry(entry, q);
    if (score !== null) results.push({ entry, score });
  }
  results.sort((a, b) =>
    a.score - b.score || a.entry.headword.localeCompare(b.entry.headword));
  return results;
}

/** 선택한 학년 이하의 뜻갈래만 남는 표제어인지. 하나도 없으면 목록에서 감춘다. */
export function visibleSenseCount(entry: Entry, maxLevel: Level): number {
  return entry.senses.filter((s) => s.level <= maxLevel).length;
}
