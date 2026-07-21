# 초등 영한사전

초등학생이 어른 없이 혼자 열어도, 찾은 단어를 **이해하고 · 소리 내어 읽고 · 며칠 뒤에도 기억하게** 하는 영한사전.

## 문서

기능을 넣을지 말지 다툴 때는 아래 순서로 판단한다. 위쪽 문서가 항상 우선한다.

| 문서 | 내용 |
|---|---|
| [00 · 제품 정의](docs/00-product.md) | 목표, 대상, 해결할 문제와 우선순위, **비목표** |
| [01 · 사전 편찬 지침](docs/01-content-policy.md) | 정의 어휘, 예문 규칙, 표제어 선정. **가장 중요한 문서** |
| [02 · 학습 설계](docs/02-learning-design.md) | 세션 구조, 반복 알고리즘, 문제 유형, 오답 처리 |
| [03 · 기술 결정 기록](docs/03-architecture.md) | ADR. 결정과 그 이유 |
| [04 · 로드맵](docs/04-roadmap.md) | M0~M3 마일스톤과 완료 기준 |
| [05 · 검증기 계약](docs/05-validation-contract.md) | 토큰화 명세, 순환 탐지, 검사 항목 V01~V16 |

## 현재 상태

**M1 (사전) 진행 중** — 앱 골격·검색·표제어 화면 동작. 다음은 표제어 200개와 오디오. [로드맵](docs/04-roadmap.md) 참조.

## 실행

```bash
npm install
npm run dev        # 개발 서버 (http://localhost:5173)
npm run build      # 타입 검사 + 프로덕션 빌드 (PWA 포함)
```

Vite + React 19 + TypeScript. 사전 데이터는 빌드에 번들되어 오프라인 동작한다(ADR-003).

## 검증기

```bash
npm run validate           # data/entries.json — 위반이 나오면 실패
npm run validate:fixture   # 위반 fixture — _expect와 다르면 실패
npm test                   # entries + sample + fixture 전부
```

의존성이 없다. Node 22.6+가 TypeScript를 그대로 실행하므로 `npm install`이 필요 없다.
규칙 정의는 [05 · 검증기 계약](docs/05-validation-contract.md).

## 구성

```
docs/                     설계 문서
src/                      앱 — 검색 · 표제어 화면 · 학년/테마 설정
  data/dictionary.ts        entries.json 번들 로드
  search/search.ts          오타 관용 검색
  components/EntryCard.tsx   사전 지면 렌더
tools/validate/           검증기 — 토큰화 · 어휘 판정 · V01~V16 · CLI
src/types/entry.ts        데이터 모델 (스키마 v2)
data/moe-vocabulary.json  교육과정 [별표 3] 기본 어휘 800/1,200/1,000 · 검수 완료
data/defining-vocabulary.json  정의 어휘 962단어 — 뜻풀이에 쓸 수 있는 화이트리스트
data/inflections.json     불규칙 굴절형 표 — 검증기의 원형 환원용
data/exempt-classes.json  어휘로 치지 않는 부류 — 호칭·단위·약어·숫자 등
data/entries.json         실제 사전 데이터 — 3학년 빈출어 20개
data/entries.sample.json  유효 샘플 — 검증기 전 항목을 통과해야 한다
data/entries.invalid.json 위반 fixture — 각 표제어가 규칙 하나씩을 어긴다
prototype/entry.html      지면 조판 시안 (브라우저에서 바로 열림)
```

## 원칙

1. **뜻풀이는 표제어보다 반드시 쉬워야 한다.** 정의 어휘 1,000단어 화이트리스트로 강제한다
2. **아이는 혼자 쓴다.** 설명이 필요한 UI, 교정해 주는 어른, 끝이 없는 화면을 전제하지 않는다
3. **사전이 먼저고 학습이 나중이다.** 찾는 경험이 좋아야 학습도 일어난다
4. **어휘 수보다 표제어 하나의 품질.**
5. **되돌릴 수 없는 것만 미리 고정한다.** 스키마와 검증 기준은 지금 정하고, 코드만 고치면 되는 규칙은 필요할 때 정한다
