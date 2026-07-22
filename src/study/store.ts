/**
 * 학습 기록 영속화 — IndexedDB. 서버 없이 기기 안에만 (ADR-002).
 * 깨진 가져오기가 기존 기록을 덮어쓰지 않도록 검증 후 저장한다 (ADR-008).
 */

import type { StudyRecord, StudyState } from '../types/entry.ts';
import { STUDY_SCHEMA_VERSION } from '../types/entry.ts';

const DB_NAME = 'dictionary';
const STORE = 'study';
const KEY = 'state';

export const emptyState = (): StudyState => ({
  schemaVersion: STUDY_SCHEMA_VERSION,
  records: [],
  lastSessionOn: null,
});

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadState(): Promise<StudyState> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(migrate(req.result) ?? emptyState());
      req.onerror = () => resolve(emptyState());
    });
  } catch {
    return emptyState();
  }
}

export async function saveState(state: StudyState): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(state, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 스키마 버전 마이그레이션 진입점. 지금은 v1뿐. */
function migrate(raw: unknown): StudyState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<StudyState>;
  if (!Array.isArray(s.records)) return null;
  return {
    schemaVersion: STUDY_SCHEMA_VERSION,
    records: s.records as StudyRecord[],
    lastSessionOn: s.lastSessionOn ?? null,
  };
}

// ── 내보내기 / 불러오기 ────────────────────────────────────────

export function exportState(state: StudyState): string {
  return JSON.stringify(state, null, 2);
}

export interface ImportResult {
  ok: boolean;
  state?: StudyState;
  error?: string;
}

/**
 * 가져온 JSON을 검증한다. 형식이 깨졌으면 실패를 반환하고 **기존 기록을 건드리지 않는다.**
 * 데이터 손실은 되돌릴 수 없으므로 관대하게 받지 않는다.
 */
export function parseImport(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: '파일을 읽을 수 없어요. 올바른 학습 기록 파일인지 확인해 주세요.' };
  }
  const state = migrate(raw);
  if (!state) {
    return { ok: false, error: '학습 기록 형식이 아니에요. 다른 파일을 골라 주세요.' };
  }
  for (const r of state.records) {
    if (!r.target || typeof r.box !== 'number' || typeof r.dueOn !== 'string') {
      return { ok: false, error: '기록 일부가 손상됐어요. 이 파일은 불러오지 않았어요.' };
    }
  }
  return { ok: true, state };
}
