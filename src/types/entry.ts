/**
 * 초등 영한 사전 앱 - 데이터 모델
 *
 * 설계 원칙
 * 1. 영영 정의(`en`)는 정의 어휘 1,000단어 안에서만 쓴다. (Longman LDOCE 방식)
 * 2. 한국어 뜻(`ko`)은 정의가 아니라 '대응어'다. 짧게 유지한다.
 * 3. 난이도(`level`)는 표제어가 아니라 뜻갈래 단위다. 3학년에게는 level 1만 보여준다.
 * 4. 단어를 가리키는 모든 참조는 문자열이 아니라 EntryId다. 동형이의어 때문이다.
 *
 * 관련 문서: docs/01-content-policy.md, docs/05-validation-contract.md
 */

/** 사전 데이터 구조의 버전. 구조를 바꾸면 올린다. */
export const SCHEMA_VERSION = 2;

/** 학습 기록 구조의 버전. 사전과 별도로 관리한다. */
export const STUDY_SCHEMA_VERSION = 1;

/**
 * 표제어 식별자. 동형이의어는 접미 번호로 분리한다: 'light-1', 'light-2'
 * 표기(headword)와 식별자를 분리하는 이유 — 'light'라는 문자열만으로는
 * 어느 표제어를 가리키는지 결정할 수 없다.
 */
export type EntryId = string;

/**
 * 뜻갈래 식별자. 학습 기록이 이 값을 참조한다.
 * **한 번 발급하면 재사용하지 않는다.** 뜻갈래를 삭제해도 번호를 비워 둔다.
 */
export type SenseId = string;

/** 연어 식별자. 연어도 학습 단위이므로 안정적 id가 필요하다. */
export type CollocationId = string;

/** 예문 식별자. 연어가 예문을 참조하기 때문에 필요하다. */
export type ExampleId = string;

/** 품사. 지면에서는 이탤릭 약어(n., v., adj.)로 조판된다. */
export type Pos =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'determiner';

/** 학년 난이도. 1=3~4학년, 2=5학년, 3=6학년, 4=중학교 */
export type Level = 1 | 2 | 3 | 4;

/**
 * 편집 상태. 1,000개 표제어 중 어디까지 됐는지 추적한다.
 * (작성일·검토일은 git이 이미 기록하므로 필드로 중복하지 않는다.)
 */
export type EditorialStatus = 'draft' | 'review' | 'done';

/** 주제 태그. 학습 문항의 오답 보기를 같은 주제에서 뽑는다. */
export type Tag = string;

// ─────────────────────────────────────────────────────────────
// 예문
// ─────────────────────────────────────────────────────────────

export interface Example {
  id: ExampleId;
  /**
   * 예문. 표제어가 나타나는 자리를 {{ }}로 감싼다. 굴절형이어도 감싼다.
   * 예: "She {{ran}} to the bus stop."
   * 인덱스 대신 마커를 쓰는 이유 — 예문을 고쳐도 위치가 어긋나지 않는다.
   */
  en: string;
  ko: string;
  /** 예문 낭독 오디오. 선택. 없으면 앱이 TTS로 대체한다. */
  audio?: string;
}

// ─────────────────────────────────────────────────────────────
// 연어
// ─────────────────────────────────────────────────────────────

/**
 * 통째로 익혀야 하는 덩어리. `play the piano`, `go for a run`.
 * P4(뜻은 알지만 문장에 못 쓴다)를 해결하는 장치다. → docs/00-product.md
 */
export interface Collocation {
  id: CollocationId;
  text: string;
  ko: string;
  /** 이 연어가 실제로 쓰인 예문. 같은 뜻갈래 안에 있어야 한다. */
  exampleId?: ExampleId;
  level: Level;
  /** 학습 카드로 출제할지. false면 지면에 표시만 하고 문제로 내지 않는다. */
  studiable: boolean;
}

// ─────────────────────────────────────────────────────────────
// 뜻갈래
// ─────────────────────────────────────────────────────────────

export interface Sense {
  id: SenseId;
  pos: Pos;
  /**
   * 쉬운 영영 정의. 한 문장, 20단어 이내.
   *
   * 정의 어휘 밖의 단어를 쓰려면 그 단어가 이 사전의 표제어여야 하고,
   * `[[표기|entryId]]` 마커로 감싸 링크로 만들어야 한다.
   * 표기와 entryId가 같으면 `[[liquid]]`로 줄여 쓸 수 있다.
   * 예: "a very big animal with two long white [[teeth|tooth]]"
   */
  en: string;
  /** 한국어 대응어. 정의가 아니다. 3어절 이내. */
  ko: string;
  level: Level;
  examples: Example[];
  collocations?: Collocation[];
  /**
   * 주제 태그. 학습이 뜻갈래 단위이므로 태그도 뜻갈래에 붙는다.
   * (표제어에 붙이면 `run`의 '달리다'와 '작동하다'가 같은 주제로 묶인다.)
   */
  tags: Tag[];
  /** 사용 팁. "보통 복수형으로 써요" 같은. */
  note?: string;
}

// ─────────────────────────────────────────────────────────────
// 표제어
// ─────────────────────────────────────────────────────────────

/** 굴절형. 초등 단계에서 불규칙형은 반드시 지면에 노출한다. */
export interface Inflections {
  plural?: string;
  past?: string;
  pastParticiple?: string;
  presentParticiple?: string;
  thirdPerson?: string;
  comparative?: string;
  superlative?: string;
  /** 불규칙형이면 지면에서 강조 표시 */
  irregular?: boolean;
}

/** 다른 표제어 참조. 검증기가 entryId의 존재를 확인한다. */
export interface EntryRef {
  entryId: EntryId;
  /** 화면 표시용. 생략하면 대상의 headword를 쓴다. */
  label?: string;
}

export interface Related {
  synonyms?: EntryRef[];
  antonyms?: EntryRef[];
  /**
   * 어족: happy → happily, happiness, unhappy
   * 표제어가 아닌 파생어가 대부분이므로 **표시 전용 문자열**이다.
   * 링크로 만들지 않고 검증하지도 않는다.
   */
  wordFamily?: string[];
}

/**
 * 발음 오디오.
 * P2(발음을 모른다)가 1순위 문제이므로 미국식 표제어 발음은 필수다. → ADR-004, ADR-005
 */
export interface EntryAudio {
  /** 미국식. 필수. 빌드 타임에 생성해 번들한다. */
  us: string;
  /** 영국식. 발음이 확연히 다를 때만 (water, can't, tomato). */
  uk?: string;
}

export interface Entry {
  id: EntryId;
  headword: string;
  /**
   * 음절 구분. 가운뎃점(·)으로 나눈다. 예: "el·e·phant"
   * 사전 조판의 정체성이자, IPA를 못 읽는 아이에게 유일하게 작동하는 시각 단서다.
   */
  syllables: string;
  /** 발음기호. 어른용 참고 정보이며 아이에게는 소리와 음절점이 주된 단서다. */
  ipa: { us: string; uk?: string };
  audio: EntryAudio;
  inflections?: Inflections;
  /** 최대 3개. 넘으면 지면이 위압적으로 변한다. → docs/01-content-policy.md */
  senses: Sense[];
  related?: Related;
  /** 삽화. 그림으로 그릴 수 있는 명사에만. 없는 편이 잘못된 그림보다 낫다. */
  illustration?: { src: string; alt: string };
  curriculum?: {
    /** 3~6=초등, 7=중학교(교육과정 **, 중·고 권장 어휘). */
    grade: 3 | 4 | 5 | 6 | 7;
    /** 출처 표기. 예: "2022 개정 교육과정 별표3" */
    source?: string;
  };
  editorialStatus: EditorialStatus;
}

export interface Dictionary {
  schemaVersion: number;
  /** 콘텐츠 버전. 표제어가 바뀔 때 올린다. 서비스 워커 캐시 갱신 판단에 쓴다. */
  contentVersion: string;
  entries: Entry[];
  /**
   * 정의 어휘는 여기 두지 않는다. `data/defining-vocabulary.json`이 단일 원천이고,
   * 검증기만 읽는다. 앱 런타임은 정의 어휘를 알 필요가 없다.
   */
}

// ─────────────────────────────────────────────────────────────
// 학습 기록
// ─────────────────────────────────────────────────────────────

/** Leitner 박스. 1=1일, 2=3일, 3=7일, 4=16일, 5=35일 뒤 복습. */
export type LeitnerBox = 1 | 2 | 3 | 4 | 5;

/** 학습 단위. 뜻갈래 또는 연어. */
export type StudyTarget =
  | { type: 'sense'; id: SenseId }
  | { type: 'collocation'; id: CollocationId };

export interface StudyRecord {
  target: StudyTarget;
  box: LeitnerBox;
  /**
   * 다음 복습일. **로컬 자정 기준 'YYYY-MM-DD'.** ISO 타임스탬프가 아니다. → ADR-007
   * 아이에게 '오늘 할 일'은 시각이 아니라 날짜다. 시각으로 저장하면
   * 여행·서머타임에 하루가 사라지거나 두 번 생긴다.
   */
  dueOn: string;
  /** 마지막 응답 시각. ISO 8601. 통계용이며 스케줄링에 쓰지 않는다. */
  lastAnsweredAt: string | null;
  attempts: number;
  correct: number;
  /** 5번 박스를 통과한 날. null이면 아직 학습 중. */
  masteredOn: string | null;
}

export interface StudyState {
  /**
   * 버전은 레코드마다가 아니라 여기 둔다.
   * 마이그레이션 진입점이 하나여야 부분 마이그레이션 상태가 생기지 않는다.
   */
  schemaVersion: number;
  records: StudyRecord[];
  /** 마지막으로 세션을 끝낸 날. 밀린 복습 계산에 쓴다. */
  lastSessionOn: string | null;
}
