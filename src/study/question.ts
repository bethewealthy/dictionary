/**
 * 문제 생성 — 순수 함수. docs/02-learning-design.md 문제 유형·보기 생성.
 *
 * 박스 1~2: 재인(뜻 고르기 / 소리 듣고 고르기). 박스 3+: 인출(철자 채우기).
 * 4지선다의 오답 3개를 못 채우면 철자 채우기로 대체한다.
 */

import type { StudyUnit } from './session.ts';

export type QuestionKind = 'meaning' | 'listen' | 'spell';

export interface Choice {
  label: string;
  correct: boolean;
}

export interface Question {
  kind: QuestionKind;
  unit: StudyUnit;
  /** 소리 낼 단어(표제어 또는 연어). */
  audioWord: string;
  audioPath?: string;
  /** 뜻 고르기: 한국어 보기 / 소리 듣고 고르기: 철자 보기 */
  choices?: Choice[];
  /** 철자 채우기: 빈칸 마스크(예 "r_bb_t")와 정답 */
  masked?: string;
  /** 정답 텍스트 (철자 채우기 판정용, 소리/뜻은 correct choice.label) */
  answer: string;
  /** 오답 화면에 보여줄 문제 지문 */
  promptEn: string;
  promptKo: string;
}

export interface QuestionOptions {
  /** 소리를 못 쓰는 세션이면 'listen'을 내지 않는다. */
  soundOff?: boolean;
  rng?: () => number;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** 철자 채우기 정답 판정: 대소문자·앞뒤 공백 무시. */
export function checkSpelling(input: string, answer: string): boolean {
  return norm(input) === norm(answer);
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function unitKo(u: StudyUnit): string {
  return u.collocation ? u.collocation.ko : u.sense.ko;
}
function unitText(u: StudyUnit): string {
  return u.collocation ? u.collocation.text : u.entry.headword;
}

/** 편집거리 (오답 철자 유사도용, 작을수록 유사). */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i += 1) {
    const cur = [i];
    for (let j = 1; j <= n; j += 1) {
      cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
    }
    prev = cur;
  }
  return prev[n];
}

/**
 * 오답 후보를 완화 순서로 정렬해 반환. docs/02 보기 생성.
 * 1) 같은 품사 + 태그 겹침  2) 같은 품사  3) 태그 겹침  4) 그 외
 * 제외: 같은 표제어, 정답과 같은 한국어 뜻.
 */
function rankDistractors(target: StudyUnit, pool: StudyUnit[]): StudyUnit[] {
  const ansKo = unitKo(target);
  const tags = new Set(target.sense.tags);
  const seen = new Set<string>();
  const scored: { u: StudyUnit; score: number }[] = [];

  for (const u of pool) {
    if (u.entry.id === target.entry.id) continue;      // 같은 표제어 제외
    if (unitKo(u) === ansKo) continue;                 // 같은 뜻 제외
    const key = unitKo(u);
    if (seen.has(key)) continue;                       // 보기 한국어 중복 제외
    seen.add(key);
    const samePos = u.sense.pos === target.sense.pos;
    const tagOverlap = u.sense.tags.some((t) => tags.has(t));
    const score = (samePos ? 2 : 0) + (tagOverlap ? 1 : 0);
    scored.push({ u, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.u);
}

function makeMeaning(target: StudyUnit, pool: StudyUnit[], rng: () => number): Question | null {
  const distractors = rankDistractors(target, pool).slice(0, 3);
  if (distractors.length < 3) return null;
  const choices: Choice[] = shuffle(
    [{ label: unitKo(target), correct: true },
     ...distractors.map((u) => ({ label: unitKo(u), correct: false }))],
    rng,
  );
  return {
    kind: 'meaning', unit: target,
    audioWord: unitText(target), audioPath: target.entry.audio.us,
    choices, answer: unitKo(target),
    promptEn: unitText(target), promptKo: unitKo(target),
  };
}

function makeListen(target: StudyUnit, pool: StudyUnit[], rng: () => number): Question | null {
  const answer = unitText(target);
  // 철자·길이가 비슷한 표제어를 오답으로 우선
  const cands = pool
    .filter((u) => u.entry.id !== target.entry.id && unitText(u) !== answer)
    .map((u) => ({ u, d: editDistance(unitText(u), answer) }));
  // 서로 다른 철자만
  const uniq: { u: StudyUnit; d: number }[] = [];
  const seen = new Set<string>();
  for (const c of cands.sort((a, b) => a.d - b.d)) {
    const t = unitText(c.u);
    if (seen.has(t)) continue;
    seen.add(t);
    uniq.push(c);
  }
  const distractors = uniq.slice(0, 3);
  if (distractors.length < 3) return null;
  const choices: Choice[] = shuffle(
    [{ label: answer, correct: true },
     ...distractors.map((c) => ({ label: unitText(c.u), correct: false }))],
    rng,
  );
  return {
    kind: 'listen', unit: target,
    audioWord: answer, audioPath: target.entry.audio.us,
    choices, answer,
    promptEn: answer, promptKo: unitKo(target),
  };
}

/** 철자 채우기 마스크: 첫 글자와 끝 글자는 남기고 가운데 일부를 _로. */
function maskWord(word: string, rng: () => number): string {
  const chars = [...word];
  const interior = chars.map((_, i) => i).filter((i) => i > 0 && i < chars.length - 1 && /[a-z]/i.test(chars[i]));
  const hideCount = Math.max(1, Math.round(interior.length * 0.5));
  const toHide = new Set(shuffle(interior, rng).slice(0, hideCount));
  return chars.map((c, i) => (toHide.has(i) ? '_' : c)).join('');
}

function makeSpell(target: StudyUnit, rng: () => number): Question {
  const answer = unitText(target);
  return {
    kind: 'spell', unit: target,
    audioWord: answer, audioPath: target.entry.audio.us,
    masked: maskWord(answer, rng), answer,
    promptEn: answer, promptKo: unitKo(target),
  };
}

/**
 * 카드 하나의 문제를 만든다. 박스와 보기 가능 여부에 따라 유형을 고른다.
 * pool = 오답 후보(보통 studiableUnits(grade)).
 */
export function makeQuestion(
  target: StudyUnit,
  box: number,
  pool: StudyUnit[],
  opts: QuestionOptions = {},
): Question {
  const rng = opts.rng ?? Math.random;

  // 박스 3+ 는 인출(철자). 연어는 구(句)라 철자 대신 뜻 고르기를 우선한다.
  if (box >= 3 && !target.collocation) {
    return makeSpell(target, rng);
  }

  // 박스 1~2 (또는 연어): 재인. 소리 듣고 고르기 ↔ 뜻 고르기.
  const preferListen = !opts.soundOff && !target.collocation && rng() < 0.5;
  const order = preferListen
    ? [makeListen, makeMeaning]
    : [makeMeaning, opts.soundOff ? null : makeListen];

  for (const maker of order) {
    if (!maker) continue;
    const q = maker(target, pool, rng);
    if (q) return q;
  }
  // 보기를 못 채우면 철자 채우기로 대체
  return makeSpell(target, rng);
}
