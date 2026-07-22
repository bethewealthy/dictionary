import { useEffect, useMemo, useRef, useState } from 'react';
import type { Entry, Level } from './types/entry.ts';
import { entries, entriesById } from './data/dictionary.ts';
import { search, visibleSenseCount } from './search/search.ts';
import { GRADE_LABELS, useGrade, useTheme } from './settings.ts';
import { EntryCard } from './components/EntryCard.tsx';
import { StudyTab } from './components/StudyTab.tsx';
import { useStudy } from './study/useStudy.ts';

const GRADES: Level[] = [1, 2, 3, 4];
type Tab = 'dict' | 'study';

export function App() {
  const [tab, setTab] = useState<Tab>('dict');
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useGrade();
  const [theme, toggleTheme] = useTheme();
  const listRef = useRef<HTMLDivElement>(null);
  const { state, loaded, persist, registerEntries } = useStudy();

  const shown = useMemo(() => {
    const base = query.trim()
      ? search(entries, query).map((r) => r.entry)
      : [...entries].sort((a, b) => a.headword.localeCompare(b.headword));
    return base.filter((e) => visibleSenseCount(e, grade) > 0);
  }, [query, grade]);

  // 검색으로 본 단어 자동 등록 (둘러보기는 제외). 입력이 멈춘 뒤 상위 결과만.
  useEffect(() => {
    if (!loaded || !query.trim() || shown.length === 0) return;
    const id = window.setTimeout(() => registerEntries(shown.slice(0, 2), grade), 800);
    return () => window.clearTimeout(id);
  }, [loaded, query, shown, grade, registerEntries]);

  const navigate = (entryId: string) => {
    const target = entriesById.get(entryId);
    if (target) setQuery(target.headword);
  };

  const openEntry = (entry: Entry) => {
    setTab('dict');
    setQuery(entry.headword);
  };

  useEffect(() => { listRef.current?.scrollTo({ top: 0 }); }, [query]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>초등 영한사전</h1>
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'dict'} onClick={() => setTab('dict')}>사전</button>
            <button type="button" role="tab" aria-selected={tab === 'study'} onClick={() => setTab('study')}>학습</button>
          </div>
        </div>

        <div className="controls">
          <div className="seg" role="group" aria-label="학년">
            {GRADES.map((g) => (
              <button key={g} type="button" aria-pressed={grade === g} onClick={() => setGrade(g)}>
                {GRADE_LABELS[g]}
              </button>
            ))}
          </div>
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="화면 밝기 바꾸기">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>

        {tab === 'dict' && (
          <div className="searchbar">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="영어 단어나 한국어 뜻으로 찾아보세요"
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {query && <button type="button" className="clear" onClick={() => setQuery('')}>지우기</button>}
          </div>
        )}
      </header>

      {tab === 'dict' ? (
        <main className="results" ref={listRef}>
          {shown.length === 0 ? (
            <p className="empty">
              <strong>‘{query}’</strong>를 찾지 못했어요.
              <br />철자를 다시 확인하거나 다른 단어로 찾아보세요.
            </p>
          ) : (
            <div className="entries">
              {shown.map((e) => (
                <EntryCard key={e.id} entry={e} maxLevel={grade} onNavigate={navigate} />
              ))}
            </div>
          )}
        </main>
      ) : (
        <main className="results">
          <StudyTab entries={entries} grade={grade} state={state} persist={persist} onOpenEntry={openEntry} />
        </main>
      )}
    </div>
  );
}
