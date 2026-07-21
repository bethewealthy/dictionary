/**
 * 토큰화 — docs/05-validation-contract.md 1절의 5단계를 그대로 옮긴 것.
 * 순서가 결과를 바꾸므로 순서까지 규칙이다.
 */

export interface Link {
  /** 지면에 보이는 표기 */
  surface: string;
  /** 실제로 가리키는 표제어 */
  entryId: string;
}

export interface Token {
  /** 정규화 전 원형 */
  raw: string;
  /** 소문자로 정규화한 형태 */
  word: string;
  /** 문장 첫 단어가 아닌데 대문자로 시작 → 고유명사로 보고 검사를 면제한다 */
  properNoun: boolean;
}

/** 축약형은 통째로 목록에 등재한다. 소유격 's만 분리하기 위해 예외를 둔다. */
const CONTRACTIONS = new Set([
  "it's", "he's", "she's", "that's", "what's", "there's", "let's", "here's",
  "who's", "where's", "how's", "one's",
]);

const SENTENCE_END = /[.!?]$/;
const EDGE_PUNCT = /^[.,!?;:"'“”‘’()]+|[.,!?;:"'“”‘’()]+$/g;

/** 정의문의 `[[표기|entryId]]` 링크를 뽑아내고 본문은 표기만 남긴다. */
export function parseLinks(text: string): { plain: string; links: Link[] } {
  const links: Link[] = [];
  const plain = text.replace(/\[\[(.+?)\]\]/g, (_m, inner: string) => {
    const [surface, entryId] = inner.split('|');
    links.push({ surface, entryId: entryId ?? surface });
    return surface;
  });
  return { plain, links };
}

/** 예문의 `{{표제어}}` 마커를 벗긴다. */
export function stripHeadwordMark(text: string): string {
  return text.replace(/\{\{(.+?)\}\}/g, '$1');
}

export function hasHeadwordMark(text: string): boolean {
  return /\{\{.+?\}\}/.test(text);
}

/**
 * 마커를 이미 벗긴 평문을 토큰으로 자른다.
 * - 하이픈은 자르지 않는다 (`ice-cream`은 한 토큰)
 * - 아포스트로피는 단어의 일부다 (`don't`는 쪼개지 않는다)
 * - 단, 소유격 `'s`는 분리한다 (`sister's` → `sister`)
 */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  let sentenceStart = true;

  for (const rawChunk of text.split(/\s+/)) {
    if (!rawChunk) continue;
    const trimmed = rawChunk.replace(EDGE_PUNCT, '');
    const endsSentence = SENTENCE_END.test(rawChunk);

    if (trimmed) {
      let raw = trimmed;
      const lower = raw.toLowerCase();
      // 소유격 분리. 축약형은 목록에 통째로 등재되므로 건드리지 않는다.
      if (/['’]s$/.test(lower) && !CONTRACTIONS.has(lower)) {
        raw = raw.slice(0, -2);
      }
      if (raw && !/^\d+$/.test(raw)) {
        out.push({
          raw,
          word: raw.toLowerCase(),
          // 문장 첫 단어는 항상 소문자화해 검사한다 → 고유명사로 보지 않는다
          properNoun: !sentenceStart && /^[A-Z]/.test(raw),
        });
      }
    }
    sentenceStart = endsSentence;
  }
  return out;
}

/** 어절 수. 한국어 대응어 길이(V05) 판정용. */
export function eojeolCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** 문장 수. 정의문이 한 문장인지 본다(V03). */
export function sentenceCount(text: string): number {
  return text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length;
}
