import { Fragment } from 'react';

/**
 * 예문의 `{{표제어}}`를 굵게 강조한다.
 * 데이터 형식은 docs/01-content-policy.md, src/types/entry.ts 참조.
 */
export function ExampleText({ text }: { text: string }) {
  const parts = text.split(/(\{\{.+?\}\})/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\{\{(.+?)\}\}$/);
        return m ? <b key={i}>{m[1]}</b> : <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

/**
 * 정의문의 `[[표기|entryId]]` 링크를 클릭 가능한 표제어 링크로 만든다.
 * 아이가 정의 안의 어려운 단어를 눌러 바로 찾아갈 수 있다.
 */
export function DefinitionText({
  text,
  onNavigate,
}: {
  text: string;
  onNavigate: (entryId: string) => void;
}) {
  const parts = text.split(/(\[\[.+?\]\])/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\[\[(.+?)\]\]$/);
        if (!m) return <Fragment key={i}>{p}</Fragment>;
        const [surface, entryId] = m[1].split('|');
        const target = entryId ?? surface;
        return (
          <button
            key={i}
            type="button"
            className="deflink"
            onClick={() => onNavigate(target)}
          >
            {surface}
          </button>
        );
      })}
    </>
  );
}
