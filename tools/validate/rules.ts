/**
 * 검사 항목 V01~V16 — docs/05-validation-contract.md 4절.
 * 각 규칙은 순수 함수이며, 규칙을 추가할 때 이 파일과 문서를 함께 고친다.
 */

import type { Dictionary, Entry, Sense } from '../../src/types/entry.ts';
import type { Lexicon } from './lexicon.ts';
import {
  eojeolCount, hasHeadwordMark, parseLinks, sentenceCount, stripHeadwordMark, tokenize,
} from './tokenize.ts';

export type Severity = 'error' | 'warn';

export interface Finding {
  code: string;
  severity: Severity;
  entryId: string;
  senseId?: string;
  message: string;
}

export interface Options {
  /** 오디오 파일이 실제로 있는지까지 볼지. M1의 생성 파이프라인이 선 뒤에 켠다. */
  checkAudioFiles?: boolean;
  audioExists?: (path: string) => boolean;
}

const DEF_MAX_WORDS = 20;
const KO_MAX_EOJEOL = 3;
const EX_MIN_WORDS = 6;
const EX_MAX_WORDS = 12;
const MAX_SENSES = 3;
/** 교육과정의 "90% 이상을 기본 어휘 목록에서" 권장에서 왔다. */
const EXAMPLE_OUTSIDE_RATIO = 0.1;

const err = (code: string, entryId: string, message: string, senseId?: string): Finding =>
  ({ code, severity: 'error', entryId, senseId, message });

// ─────────────────────────────────────────────────────────────
// 표제어 단위 검사
// ─────────────────────────────────────────────────────────────

function checkSense(entry: Entry, sense: Sense, lex: Lexicon, entryIds: Set<string>): Finding[] {
  const out: Finding[] = [];
  const { plain, links } = parseLinks(sense.en);
  const linked = new Set(links.map((l) => l.surface.toLowerCase()));

  // V01 정의 어휘 위반
  const headwordForms = new Set([entry.headword.toLowerCase()]);
  for (const t of tokenize(plain)) {
    if (linked.has(t.word)) continue;                       // 링크는 면제
    if (headwordForms.has(t.word)) continue;                // 표제어 자기 자신
    if (lex.reduce(t.word) === entry.headword.toLowerCase()) continue; // 그 굴절형
    if (!lex.isKnown(t)) {
      out.push(err('V01', entry.id, `정의 어휘 밖의 단어 '${t.raw}'`, sense.id));
    }
  }

  // V02 정의문 길이
  const defWords = tokenize(plain).length;
  if (defWords > DEF_MAX_WORDS) {
    out.push(err('V02', entry.id, `정의문이 ${defWords}단어로 ${DEF_MAX_WORDS}단어를 넘는다`, sense.id));
  }

  // V03 정의문 문장 수
  if (sentenceCount(sense.en) > 1) {
    out.push(err('V03', entry.id, '정의문이 두 문장 이상이다', sense.id));
  }

  // V05 한국어 대응어 길이
  const eojeol = eojeolCount(sense.ko);
  if (eojeol > KO_MAX_EOJEOL) {
    out.push(err('V05', entry.id, `한국어 대응어가 ${eojeol}어절이다. 대응어가 아니라 정의를 쓴 것은 아닌가`, sense.id));
  }

  // V10 뜻갈래당 예문
  if (sense.examples.length === 0) {
    out.push(err('V10', entry.id, '예문이 없다', sense.id));
  }

  for (const ex of sense.examples) {
    // V07 표제어 마커
    if (!hasHeadwordMark(ex.en)) {
      out.push(err('V07', entry.id, `예문에 {{ }} 마커가 없다: "${ex.en}"`, sense.id));
    }
    // V06 예문 길이
    const n = tokenize(stripHeadwordMark(ex.en)).length;
    if (n < EX_MIN_WORDS || n > EX_MAX_WORDS) {
      out.push(err('V06', entry.id,
        `예문이 ${n}단어다. ${EX_MIN_WORDS}~${EX_MAX_WORDS}단어여야 한다: "${ex.en}"`, sense.id));
    }
  }

  // V13 정의 내 링크 참조
  for (const l of links) {
    if (!entryIds.has(l.entryId)) {
      out.push(err('V13', entry.id, `정의 내 링크가 없는 표제어를 가리킨다: [[${l.surface}|${l.entryId}]]`, sense.id));
    }
  }

  // V15 연어의 exampleId
  const exampleIds = new Set(sense.examples.map((e) => e.id));
  for (const c of sense.collocations ?? []) {
    if (c.exampleId && !exampleIds.has(c.exampleId)) {
      out.push(err('V15', entry.id, `연어 '${c.text}'의 exampleId가 같은 뜻갈래에 없다`, sense.id));
    }
  }
  return out;
}

function checkEntry(entry: Entry, lex: Lexicon, entryIds: Set<string>, opt: Options): Finding[] {
  const out: Finding[] = [];

  // V16 음절 구분점
  if (entry.syllables.replace(/·/g, '') !== entry.headword) {
    out.push(err('V16', entry.id,
      `음절 구분점을 제거하면 '${entry.syllables.replace(/·/g, '')}'가 되어 headword와 다르다`));
  }

  // V09 뜻갈래 수
  if (entry.senses.length > MAX_SENSES) {
    out.push(err('V09', entry.id, `뜻갈래가 ${entry.senses.length}개다. ${MAX_SENSES}개를 넘으면 지면이 위압적으로 변한다`));
  }

  // V11 미국식 오디오
  if (!entry.audio?.us) {
    out.push(err('V11', entry.id, 'audio.us가 없다. 발음은 1순위 문제이므로 필수다'));
  } else if (opt.checkAudioFiles && opt.audioExists && !opt.audioExists(entry.audio.us)) {
    out.push(err('V11', entry.id, `오디오 파일이 없다: ${entry.audio.us}`));
  }

  // V12 관련어 참조
  for (const ref of [...(entry.related?.synonyms ?? []), ...(entry.related?.antonyms ?? [])]) {
    if (!entryIds.has(ref.entryId)) {
      out.push(err('V12', entry.id, `관련어가 없는 표제어를 가리킨다: ${ref.entryId}`));
    }
  }

  for (const s of entry.senses) out.push(...checkSense(entry, s, lex, entryIds));
  return out;
}

// ─────────────────────────────────────────────────────────────
// 사전 전체 검사
// ─────────────────────────────────────────────────────────────

/** V14 id 중복 — EntryId / SenseId / ExampleId / CollocationId */
function checkDuplicateIds(dict: Dictionary): Finding[] {
  const out: Finding[] = [];
  const seen = new Map<string, string>();   // id -> 처음 등장한 표제어

  const claim = (id: string, entryId: string, kind: string) => {
    const prev = seen.get(`${kind}:${id}`);
    if (prev !== undefined) {
      out.push(err('V14', entryId, `${kind} '${id}'가 중복이다 (앞서 ${prev}에 있다)`));
    } else {
      seen.set(`${kind}:${id}`, entryId);
    }
  };

  for (const e of dict.entries) {
    claim(e.id, e.id, 'EntryId');
    for (const s of e.senses) {
      claim(s.id, e.id, 'SenseId');
      for (const x of s.examples) claim(x.id, e.id, 'ExampleId');
      for (const c of s.collocations ?? []) claim(c.id, e.id, 'CollocationId');
    }
  }
  return out;
}

/**
 * V04 순환 정의 — Tarjan SCC.
 * **간선은 `[[ ]]` 링크뿐이다.** 정의문의 모든 단어를 간선으로 삼으면 기초 어휘가
 * 서로를 참조해 그래프가 거의 완전연결되고 모든 표제어가 순환에 걸린다.
 */
function checkCycles(dict: Dictionary): Finding[] {
  const graph = new Map<string, string[]>();
  for (const e of dict.entries) {
    const edges: string[] = [];
    for (const s of e.senses) {
      for (const l of parseLinks(s.en).links) edges.push(l.entryId);
    }
    graph.set(e.id, edges);
  }

  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const out: Finding[] = [];
  let counter = 0;

  const strongConnect = (v: string): void => {
    index.set(v, counter);
    low.set(v, counter);
    counter += 1;
    stack.push(v);
    onStack.add(v);

    for (const w of graph.get(v) ?? []) {
      if (!graph.has(w)) continue;                 // 없는 표제어는 V13이 따로 잡는다
      if (!index.has(w)) {
        strongConnect(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }

    if (low.get(v) === index.get(v)) {
      const comp: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        comp.push(w);
      } while (w !== v);

      if (comp.length > 1) {
        const cycle = [...comp].reverse();
        for (const id of comp) {
          out.push(err('V04', id, `순환 정의: ${cycle.join(' → ')} → ${cycle[0]}`));
        }
      }
    }
  };

  for (const v of graph.keys()) if (!index.has(v)) strongConnect(v);
  return out;
}

/**
 * V08 예문 어휘 — 사전 전체의 예문 토큰을 합산해 판정한다.
 * 교육과정이 "90% 이상"을 권장하므로 10%까지는 이미 허용된 여유다. 경고에 그친다.
 */
function checkExampleVocabulary(dict: Dictionary, lex: Lexicon): Finding[] {
  let total = 0;
  const outside: { entryId: string; word: string }[] = [];

  for (const e of dict.entries) {
    for (const s of e.senses) {
      for (const x of s.examples) {
        for (const t of tokenize(stripHeadwordMark(x.en))) {
          total += 1;
          if (!lex.isKnown(t)) outside.push({ entryId: e.id, word: t.raw });
        }
      }
    }
  }
  if (total === 0) return [];

  const ratio = outside.length / total;
  if (ratio <= EXAMPLE_OUTSIDE_RATIO) return [];

  const sample = [...new Set(outside.map((o) => o.word))].slice(0, 12).join(', ');
  return [{
    code: 'V08',
    severity: 'warn',
    entryId: '(사전 전체)',
    message:
      `예문의 목록 밖 어휘가 ${(ratio * 100).toFixed(1)}%다 (${outside.length}/${total}). ` +
      `교육과정 권장은 10% 이하. 예: ${sample}`,
  }];
}

export function validate(dict: Dictionary, lex: Lexicon, opt: Options = {}): Finding[] {
  const entryIds = new Set(dict.entries.map((e) => e.id));
  const out: Finding[] = [];
  for (const e of dict.entries) out.push(...checkEntry(e, lex, entryIds, opt));
  out.push(...checkDuplicateIds(dict));
  out.push(...checkCycles(dict));
  out.push(...checkExampleVocabulary(dict, lex));
  return out.sort((a, b) => a.code.localeCompare(b.code) || a.entryId.localeCompare(b.entryId));
}
