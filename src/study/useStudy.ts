import { useCallback, useEffect, useRef, useState } from 'react';
import type { Entry, Level, StudyState, StudyTarget } from '../types/entry.ts';
import { emptyState, loadState, saveState } from './store.ts';
import { indexRecords, newRecord, targetKey, today } from './schedule.ts';

/** 학습 상태를 IndexedDB와 동기화하는 훅. */
export function useStudy() {
  const [state, setState] = useState<StudyState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    loadState().then((s) => {
      setState(s);
      setLoaded(true);
    });
  }, []);

  // 변경 시 디바운스 저장
  const persist = useCallback((next: StudyState) => {
    setState(next);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void saveState(next), 300);
  }, []);

  /** 검색으로 본 표제어의 현재 학년 이하 뜻갈래를 신규 카드로 등록(이미 있으면 무시). */
  const registerEntries = useCallback((entries: Entry[], grade: Level) => {
    setState((prev) => {
      const seen = indexRecords(prev.records);
      const add = [];
      const day = today();
      for (const e of entries) {
        for (const s of e.senses) {
          if (s.level > grade) continue;
          const t: StudyTarget = { type: 'sense', id: s.id };
          if (!seen.has(targetKey(t))) add.push(newRecord(t, day));
        }
      }
      if (add.length === 0) return prev;
      const next = { ...prev, records: [...prev.records, ...add] };
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => void saveState(next), 300);
      return next;
    });
  }, []);

  return { state, loaded, persist, registerEntries };
}
