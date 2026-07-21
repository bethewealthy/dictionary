import { useEffect, useMemo, useRef, useState } from 'react';
import type { Level } from './types/entry.ts';
import { entries, entriesById } from './data/dictionary.ts';
import { search, visibleSenseCount } from './search/search.ts';
import { GRADE_LABELS, useGrade, useTheme } from './settings.ts';
import { EntryCard } from './components/EntryCard.tsx';

const GRADES: Level[] = [1, 2, 3];

export function App() {
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useGrade();
  const [theme, toggleTheme] = useTheme();
  const listRef = useRef<HTMLDivElement>(null);

  // 표제어 목록: 질의가 있으면 검색 결과, 없으면 가나다순 전체(둘러보기).
  const shown = useMemo(() => {
    const base = query.trim()
      ? search(entries, query).map((r) => r.entry)
      : [...entries].sort((a, b) => a.headword.localeCompare(b.headword));
    // 선택 학년에 보여줄 뜻갈래가 하나도 없는 표제어는 감춘다
    return base.filter((e) => visibleSenseCount(e, grade) > 0);
  }, [query, grade]);

  // 정의 안의 링크나 관련어를 누르면 그 표제어로 이동한다
  const navigate = (entryId: string) => {
    const target = entriesById.get(entryId);
    if (!target) return;
    setQuery(target.headword);
  };

  // 질의가 바뀌면 목록 맨 위로
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [query]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>초등 영한사전</h1>
          <span className="count">표제어 {entries.length}</span>
        </div>

        <div className="controls">
          <div className="seg" role="group" aria-label="학년">
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={grade === g}
                onClick={() => setGrade(g)}
              >
                {GRADE_LABELS[g]}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="화면 밝기 바꾸기"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>

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
          {query && (
            <button type="button" className="clear" onClick={() => setQuery('')}>
              지우기
            </button>
          )}
        </div>
      </header>

      <main className="results" ref={listRef}>
        {shown.length === 0 ? (
          <p className="empty">
            <strong>‘{query}’</strong>를 찾지 못했어요.
            <br />
            철자를 다시 확인하거나 다른 단어로 찾아보세요.
          </p>
        ) : (
          <div className="entries">
            {shown.map((e) => (
              <EntryCard key={e.id} entry={e} maxLevel={grade} onNavigate={navigate} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
