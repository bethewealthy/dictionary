import type { Dictionary, Entry } from '../types/entry.ts';
import raw from '../../data/entries.json';

// 빌드 타임 번들 (ADR-003). 런타임 네트워크 호출 없이 오프라인 동작한다.
export const dictionary = raw as unknown as Dictionary;

export const entries: Entry[] = dictionary.entries;

export const entriesById = new Map<string, Entry>(
  entries.map((e) => [e.id, e]),
);
