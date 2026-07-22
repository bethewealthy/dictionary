import { useMemo, useRef, useState } from 'react';
import type { Entry, Level, StudyState } from '../types/entry.ts';
import { buildSession, stats, studiableUnits, type SessionCard } from '../study/session.ts';
import { today } from '../study/schedule.ts';
import { exportState, parseImport } from '../study/store.ts';
import { audioAvailable } from '../audio.ts';
import { SessionRunner } from './SessionRunner.tsx';

interface Props {
  entries: Entry[];
  grade: Level;
  state: StudyState;
  persist: (s: StudyState) => void;
  onOpenEntry: (entry: Entry) => void;
}

export function StudyTab({ entries, grade, state, persist, onOpenEntry }: Props) {
  const [active, setActive] = useState<SessionCard[] | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const day = today();

  const pool = useMemo(() => studiableUnits(entries, grade), [entries, grade]);
  const session = useMemo(
    () => buildSession(entries, state.records, grade, day),
    [entries, state.records, grade, day],
  );
  const st = useMemo(() => stats(state.records), [state.records]);

  if (active) {
    return (
      <SessionRunner
        cards={active}
        pool={pool}
        records={state.records}
        day={day}
        soundOff={!audioAvailable}
        onUpdate={(records) => persist({ ...state, records, lastSessionOn: day })}
        onExit={() => setActive(null)}
        onOpenEntry={onOpenEntry}
      />
    );
  }

  const totalCards = session.counts.new + session.counts.review;

  const doExport = () => {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `학습기록-${day}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = (file: File) => {
    file.text().then((text) => {
      const res = parseImport(text);
      if (res.ok && res.state) {
        persist(res.state);
        setImportMsg(`불러왔어요. 기록 ${res.state.records.length}개.`);
      } else {
        setImportMsg(res.error ?? '불러오지 못했어요.');
      }
    });
  };

  return (
    <div className="study-home">
      <section className="study-start">
        <h2>오늘의 학습</h2>
        {totalCards > 0 ? (
          <>
            <p className="study-counts">
              새 단어 <b>{session.counts.new}</b> · 복습 <b>{session.counts.review}</b>
              {session.counts.dueRemaining > 0 && (
                <span className="study-carry"> (복습 {session.counts.dueRemaining}개는 내일)</span>
              )}
            </p>
            <button type="button" className="study-go" onClick={() => setActive(session.cards)}>
              시작하기
            </button>
          </>
        ) : (
          <p className="study-done">
            오늘 할 학습을 다 마쳤어요. 사전에서 새 단어를 찾아보면 내일 학습에 나와요.
          </p>
        )}
      </section>

      <section className="study-stats">
        <div className="stat">
          <span className="stat-num">{st.mastered}</span>
          <span className="stat-label">익힌 단어</span>
        </div>
        <div className="stat">
          <span className="stat-num">{st.learning}</span>
          <span className="stat-label">배우는 중</span>
        </div>
        <div className="stat">
          <span className="stat-num">
            {st.box4FirstReviewRate === null ? '—' : `${Math.round(st.box4FirstReviewRate * 100)}%`}
          </span>
          <span className="stat-label">오래 기억 정답률</span>
        </div>
      </section>

      <section className="study-backup">
        <button type="button" onClick={doExport}>학습 기록 내보내기</button>
        <button type="button" onClick={() => fileRef.current?.click()}>불러오기</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }}
        />
        {importMsg && <p className="import-msg">{importMsg}</p>}
      </section>
    </div>
  );
}
