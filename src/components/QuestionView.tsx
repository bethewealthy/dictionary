import { useEffect, useRef, useState } from 'react';
import type { Question } from '../study/question.ts';
import { checkSpelling } from '../study/question.ts';
import { playWord } from '../audio.ts';

/**
 * 문제 한 개를 렌더하고 답을 받는다.
 * onAnswer(correct, chosenLabel)로 결과를 올린다. 정오답 판정은 여기서 한다.
 */
export function QuestionView({
  question,
  onAnswer,
}: {
  question: Question;
  onAnswer: (correct: boolean) => void;
}) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 새 문제로 바뀌면 입력 초기화, 소리 문제는 자동 재생
  useEffect(() => {
    setTyped('');
    if (question.kind === 'listen') {
      void playWord(question.audioWord, question.audioPath);
    }
    if (question.kind === 'spell') inputRef.current?.focus();
  }, [question]);

  const say = () => void playWord(question.audioWord, question.audioPath);

  if (question.kind === 'spell') {
    return (
      <div className="q">
        <p className="q-instr">소리를 듣고 단어를 완성하세요</p>
        <button type="button" className="q-audio" onClick={say}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2 4.5 5H2v6h2.5L8 14V2zm3 2.6a5 5 0 0 1 0 6.8l-1-1a3.6 3.6 0 0 0 0-4.8l1-1z" /></svg>
          소리 듣기
        </button>
        <p className="q-ko">{question.promptKo}</p>
        <p className="q-mask">{question.masked}</p>
        <form
          onSubmit={(e) => { e.preventDefault(); if (typed.trim()) onAnswer(checkSpelling(typed, question.answer)); }}
        >
          <input
            ref={inputRef}
            className="q-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="여기에 입력"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="철자 입력"
          />
          <button type="submit" className="q-submit" disabled={!typed.trim()}>확인</button>
        </form>
      </div>
    );
  }

  // 뜻 고르기 / 소리 듣고 고르기
  const isListen = question.kind === 'listen';
  return (
    <div className="q">
      {isListen ? (
        <>
          <p className="q-instr">소리를 듣고 알맞은 단어를 고르세요</p>
          <button type="button" className="q-audio" onClick={say}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2 4.5 5H2v6h2.5L8 14V2zm3 2.6a5 5 0 0 1 0 6.8l-1-1a3.6 3.6 0 0 0 0-4.8l1-1z" /></svg>
            다시 듣기
          </button>
        </>
      ) : (
        <>
          <p className="q-instr">알맞은 뜻을 고르세요</p>
          <p className="q-word">{question.promptEn}</p>
        </>
      )}
      <ul className="q-choices">
        {question.choices!.map((c) => (
          <li key={c.label}>
            <button type="button" onClick={() => onAnswer(c.correct)}>{c.label}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
