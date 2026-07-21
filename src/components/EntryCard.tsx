import type { Entry, Inflections, Level, Pos, Sense } from '../types/entry.ts';
import { playWord } from '../audio.ts';
import { DefinitionText, ExampleText } from './RichText.tsx';

const POS_LABEL: Record<Pos, string> = {
  noun: 'n.',
  verb: 'v.',
  adjective: 'adj.',
  adverb: 'adv.',
  pronoun: 'pron.',
  preposition: 'prep.',
  conjunction: 'conj.',
  interjection: 'int.',
  determiner: 'det.',
};

/** 음절 구분점(·)을 별색으로 찍는다. 긴 단어를 끊어 읽는 시각 단서다. */
function Headword({ syllables }: { syllables: string }) {
  const parts = syllables.split('·');
  return (
    <span className="headword">
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <span className="dot">·</span>}
        </span>
      ))}
    </span>
  );
}

function InflectionLine({ inf }: { inf: Inflections }) {
  const items: string[] = [];
  if (inf.plural) items.push(`복수형 ${inf.plural}`);
  if (inf.past) items.push(`과거형 ${inf.past}`);
  if (inf.pastParticiple && inf.pastParticiple !== inf.past) {
    items.push(`과거분사 ${inf.pastParticiple}`);
  }
  if (inf.presentParticiple) items.push(`-ing형 ${inf.presentParticiple}`);
  if (inf.comparative) items.push(`비교급 ${inf.comparative}`);
  if (inf.superlative) items.push(`최상급 ${inf.superlative}`);
  if (items.length === 0) return null;

  return (
    <p className="inflect">
      {items.map((t, i) => {
        const [label, form] = t.split(' ');
        return (
          <span key={i}>
            {i > 0 && ' · '}
            {label} <b>{form}</b>
          </span>
        );
      })}
      {inf.irregular && <span className="irr">불규칙</span>}
    </p>
  );
}

function SenseView({
  sense,
  index,
  onNavigate,
}: {
  sense: Sense;
  index: number;
  onNavigate: (id: string) => void;
}) {
  return (
    <li className="sense">
      <span className="sense-num">{index}</span>
      <div className="sense-body">
        <p className="def">
          <span className="pos" data-pos={sense.pos}>
            {POS_LABEL[sense.pos]}
          </span>{' '}
          <DefinitionText text={sense.en} onNavigate={onNavigate} />
          {'  '}
          <span className="sense-ko">{sense.ko}</span>
        </p>

        <ul className="examples">
          {sense.examples.map((ex) => (
            <li key={ex.id}>
              <span className="ex-en">
                <ExampleText text={ex.en} />
              </span>
              <span className="ex-ko">{ex.ko}</span>
            </li>
          ))}
        </ul>

        {sense.collocations?.map((c) => (
          <p key={c.id} className="colloc">
            <span className="colloc-en">{c.text}</span>
            <span className="colloc-ko">{c.ko}</span>
          </p>
        ))}

        {sense.note && <p className="note">{sense.note}</p>}
      </div>
    </li>
  );
}

export function EntryCard({
  entry,
  maxLevel,
  onNavigate,
}: {
  entry: Entry;
  maxLevel: Level;
  onNavigate: (entryId: string) => void;
}) {
  const senses = entry.senses.filter((s) => s.level <= maxLevel);
  if (senses.length === 0) return null;

  const say = () => void playWord(entry.headword, entry.audio.us);

  return (
    <article className="entry" id={`entry-${entry.id}`}>
      <div className="entry-head">
        <Headword syllables={entry.syllables} />
        <span className="pron">
          <span className="pron-pair">
            <span className="pron-tag">US</span>
            <span className="ipa">{entry.ipa.us}</span>
          </span>
          {entry.ipa.uk && (
            <span className="pron-pair">
              <span className="pron-tag">UK</span>
              <span className="ipa">{entry.ipa.uk}</span>
            </span>
          )}
          <button type="button" className="say" onClick={say}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 2 4.5 5H2v6h2.5L8 14V2zm3 2.6a5 5 0 0 1 0 6.8l-1-1a3.6 3.6 0 0 0 0-4.8l1-1z" />
            </svg>
            발음 듣기
          </button>
        </span>
      </div>

      {entry.inflections && <InflectionLine inf={entry.inflections} />}

      <ol className="senses">
        {senses.map((s, i) => (
          <SenseView key={s.id} sense={s} index={i + 1} onNavigate={onNavigate} />
        ))}
      </ol>

      {entry.related && (entry.related.synonyms || entry.related.antonyms || entry.related.wordFamily) && (
        <dl className="related">
          {entry.related.synonyms && entry.related.synonyms.length > 0 && (
            <div>
              <dt>비슷한 말</dt>
              <dd>{entry.related.synonyms.map((r) => r.label ?? r.entryId).join(' · ')}</dd>
            </div>
          )}
          {entry.related.antonyms && entry.related.antonyms.length > 0 && (
            <div>
              <dt>반대말</dt>
              <dd>{entry.related.antonyms.map((r) => r.label ?? r.entryId).join(' · ')}</dd>
            </div>
          )}
          {entry.related.wordFamily && entry.related.wordFamily.length > 0 && (
            <div>
              <dt>같은 뿌리</dt>
              <dd>{entry.related.wordFamily.join(' · ')}</dd>
            </div>
          )}
        </dl>
      )}
    </article>
  );
}
