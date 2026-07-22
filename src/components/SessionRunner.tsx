import { useMemo, useRef, useState } from 'react';
import type { Entry, StudyRecord } from '../types/entry.ts';
import type { SessionCard, StudyUnit } from '../study/session.ts';
import { applyAnswer, newRecord, targetKey } from '../study/schedule.ts';
import { makeQuestion } from '../study/question.ts';
import { playCorrectChime, playWord } from '../audio.ts';
import { QuestionView } from './QuestionView.tsx';

const MAX_SESSION_ATTEMPTS = 2; // 카드당 세션 내 최대 출제 (당일 재출제 1회)

interface Props {
  cards: SessionCard[];
  pool: StudyUnit[];
  records: StudyRecord[];
  day: string;
  soundOff: boolean;
  onUpdate: (records: StudyRecord[]) => void;
  onExit: () => void;
  onOpenEntry: (entry: Entry) => void;
}

export function SessionRunner({ cards, pool, records, day, soundOff, onUpdate, onExit, onOpenEntry }: Props) {
  const [queue, setQueue] = useState<SessionCard[]>(cards);
  const [cursor, setCursor] = useState(0);
  const [feedback, setFeedback] = useState<null | { card: SessionCard; correct: boolean }>(null);
  const recsRef = useRef<Map<string, StudyRecord>>(
    new Map(records.map((r) => [targetKey(r.target), r])),
  );
  const attemptsRef = useRef<Map<string, number>>(new Map());
  const finishedRef = useRef<Set<string>>(new Set());
  const total = cards.length;

  const card = queue[cursor];
  const boxFor = (c: SessionCard) => recsRef.current.get(targetKey(c.target))?.box ?? c.record?.box ?? 1;

  // 현재 카드의 문제 (카드/박스가 바뀔 때만 새로 생성)
  const question = useMemo(
    () => (card ? makeQuestion(card, boxFor(card), pool, { soundOff }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card, cursor],
  );

  if (!card) return <EndScreen records={records} onExit={onExit} />;

  const remaining = total - finishedRef.current.size;

  const handleAnswer = (correct: boolean) => {
    const key = targetKey(card.target);
    const base = recsRef.current.get(key) ?? card.record ?? newRecord(card.target, day);
    const updated = applyAnswer(base, correct, day);
    recsRef.current.set(key, updated);
    onUpdate([...recsRef.current.values()]);

    const n = (attemptsRef.current.get(key) ?? 0) + 1;
    attemptsRef.current.set(key, n);

    if (correct) {
      playCorrectChime(); // 정답에만 효과음. 오답에는 소리 없음.
      finishedRef.current.add(key);
      advance();
    } else {
      setFeedback({ card, correct: false });
    }
  };

  const dismissFeedback = () => {
    const key = targetKey(card.target);
    const n = attemptsRef.current.get(key) ?? 1;
    if (n < MAX_SESSION_ATTEMPTS) {
      setQueue((q) => [...q, card]); // 당일 재출제: 맨 뒤로
    } else {
      finishedRef.current.add(key);
    }
    setFeedback(null);
    advance();
  };

  const advance = () => setCursor((c) => c + 1);

  if (feedback) {
    return (
      <FeedbackScreen
        card={feedback.card}
        onNext={dismissFeedback}
        onOpenEntry={() => onOpenEntry(feedback.card.entry)}
      />
    );
  }

  return (
    <div className="session">
      <div className="session-bar">
        <button type="button" className="session-quit" onClick={onExit}>그만하기</button>
        <span className="session-remain">남은 문제 <b>{Math.max(remaining, 1)}</b></span>
      </div>
      {question && <QuestionView question={question} onAnswer={handleAnswer} />}
    </div>
  );
}

function FeedbackScreen({ card, onNext, onOpenEntry }: {
  card: SessionCard; onNext: () => void; onOpenEntry: () => void;
}) {
  const word = card.collocation ? card.collocation.text : card.entry.headword;
  const ko = card.collocation ? card.collocation.ko : card.sense.ko;
  const ex = card.sense.examples[0];

  // 오답 화면: 정답 + 소리 자동 재생 + 예문 (docs/02)
  useAutoPlay(word, card.entry.audio.us);

  return (
    <div className="feedback">
      <p className="fb-tag">다시 볼까요?</p>
      <p className="fb-word">{word}</p>
      <p className="fb-ko">{ko}</p>
      <button type="button" className="q-audio" onClick={() => void playWord(word, card.entry.audio.us)}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2 4.5 5H2v6h2.5L8 14V2zm3 2.6a5 5 0 0 1 0 6.8l-1-1a3.6 3.6 0 0 0 0-4.8l1-1z" /></svg>
        다시 듣기
      </button>
      {ex && (
        <p className="fb-ex">
          <span className="fb-ex-en">{ex.en.replace(/\{\{(.+?)\}\}/g, '$1')}</span>
          <span className="fb-ex-ko">{ex.ko}</span>
        </p>
      )}
      <div className="fb-actions">
        <button type="button" className="fb-more" onClick={onOpenEntry}>사전에서 보기</button>
        <button type="button" className="fb-next" onClick={onNext}>다음</button>
      </div>
    </div>
  );
}

function useAutoPlay(word: string, path?: string) {
  const done = useRef(false);
  if (!done.current) {
    done.current = true;
    // 사용자 제스처(답 제출) 직후라 대개 통과하지만, 실패해도 '다시 듣기'가 있다
    void playWord(word, path);
  }
}

function EndScreen({ records, onExit }: { records: StudyRecord[]; onExit: () => void }) {
  const mastered = records.filter((r) => r.masteredOn !== null).length;
  const learning = records.filter((r) => r.masteredOn === null && r.attempts > 0).length;
  return (
    <div className="end">
      <p className="end-check">✓</p>
      <h2>오늘 학습을 마쳤어요!</h2>
      <p className="end-stat">지금까지 익힌 단어 <b>{mastered}</b>개 · 배우는 중 <b>{learning}</b>개</p>
      <button type="button" className="end-btn" onClick={onExit}>사전으로 돌아가기</button>
    </div>
  );
}
