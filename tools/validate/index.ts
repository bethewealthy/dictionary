#!/usr/bin/env node
/**
 * 사전 데이터 검증기.
 *
 *   node tools/validate/index.ts data/entries.sample.json
 *   node tools/validate/index.ts --fixture data/entries.invalid.json
 *   node tools/validate/index.ts --audio data/entries.json
 *
 * --fixture 는 각 표제어가 `_expect`에 적힌 코드만 내는지 검사한다.
 *            fixture 계약이 깨지면 실패한다 (위반이 나오는 것 자체는 정상이다).
 * --audio    는 오디오 파일의 실재까지 확인한다. M1의 생성 파이프라인이 선 뒤에 쓴다.
 *
 * 규칙 정의: docs/05-validation-contract.md
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Dictionary } from '../../src/types/entry.ts';
import { Lexicon } from './lexicon.ts';
import { validate, type Finding } from './rules.ts';

interface FixtureEntry { id: string; _expect?: string[]; _why?: string }

const C = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

function report(findings: Finding[]): void {
  const byCode = new Map<string, Finding[]>();
  for (const f of findings) {
    const list = byCode.get(f.code) ?? [];
    list.push(f);
    byCode.set(f.code, list);
  }
  for (const [code, list] of [...byCode].sort()) {
    const tag = list[0].severity === 'warn' ? C.yellow(code) : C.red(code);
    console.log(`\n  ${tag}  ${list.length}건`);
    for (const f of list) {
      const where = f.senseId ? `${f.entryId} · ${f.senseId}` : f.entryId;
      console.log(`    ${where.padEnd(22)} ${f.message}`);
    }
  }
}

/** fixture 계약 검사: 각 표제어가 _expect의 코드만, 그리고 그 코드를 실제로 내는가. */
function checkFixtureContract(entries: FixtureEntry[], findings: Finding[]): boolean {
  const actual = new Map<string, Set<string>>();
  for (const f of findings) {
    if (f.severity === 'warn') continue;
    if (!actual.has(f.entryId)) actual.set(f.entryId, new Set());
    actual.get(f.entryId)!.add(f.code);
  }

  let ok = true;
  console.log(`\n  ${C.bold('fixture 계약')}  표제어마다 _expect의 코드만 나와야 한다\n`);
  for (const e of entries) {
    const expected = new Set(e._expect ?? []);
    const got = actual.get(e.id) ?? new Set<string>();
    const missing = [...expected].filter((c) => !got.has(c));
    const extra = [...got].filter((c) => !expected.has(c));

    if (missing.length === 0 && extra.length === 0) {
      console.log(`    ${C.green('✓')} ${e.id.padEnd(12)} ${[...expected].join(', ') || '위반 없음'}`);
    } else {
      ok = false;
      const parts = [
        missing.length ? C.red(`검출 실패 ${missing.join(', ')}`) : '',
        extra.length ? C.red(`예상 밖 ${extra.join(', ')}`) : '',
      ].filter(Boolean);
      console.log(`    ${C.red('✗')} ${e.id.padEnd(12)} ${parts.join(' · ')}`);
    }
  }
  return ok;
}

function main(): void {
  const args = process.argv.slice(2);
  const fixtureMode = args.includes('--fixture');
  const audioMode = args.includes('--audio');
  const path = args.find((a) => !a.startsWith('--'));

  if (!path) {
    console.error('사용법: node tools/validate/index.ts [--fixture] [--audio] <entries.json>');
    process.exit(2);
  }

  const dict = JSON.parse(readFileSync(path, 'utf8')) as Dictionary;
  const lex = new Lexicon();
  const findings = validate(dict, lex, {
    checkAudioFiles: audioMode,
    // 오디오는 public/ 아래 정적 파일로 서빙된다 (audio.us = "audio/us/<id>.mp3")
    audioExists: (p) => existsSync(join('public', p)),
  });

  const errors = findings.filter((f) => f.severity === 'error');
  const warns = findings.filter((f) => f.severity === 'warn');

  console.log(
    `\n${C.bold(path)}  ${C.dim(
      `표제어 ${dict.entries.length} · 정의 어휘 ${lex.accepted.size} 토큰`,
    )}`,
  );

  if (fixtureMode) {
    report(findings);
    const ok = checkFixtureContract(dict.entries as unknown as FixtureEntry[], findings);
    console.log(ok
      ? `\n  ${C.green('fixture 계약 통과')} — 검출 ${errors.length}건이 전부 의도된 위반이다\n`
      : `\n  ${C.red('fixture 계약 위반')} — 검증기나 fixture 중 하나가 틀렸다\n`);
    process.exit(ok ? 0 : 1);
  }

  if (findings.length === 0) {
    console.log(`\n  ${C.green('위반 없음')}\n`);
    process.exit(0);
  }

  report(findings);
  console.log(`\n  ${errors.length ? C.red(`오류 ${errors.length}건`) : C.green('오류 없음')}` +
    `${warns.length ? ` · ${C.yellow(`경고 ${warns.length}건`)}` : ''}\n`);
  process.exit(errors.length ? 1 : 0);
}

main();
