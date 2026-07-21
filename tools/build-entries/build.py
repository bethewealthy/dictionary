"""
표제어 빌드 — 저작 소스 + 생성 발음 → data/entries.json

사람이 저작하는 것: 정의(def), 한국어(ko), 예문(ex), 품사, 굴절, 태그. (판단이 필요)
스크립트가 생성하는 것: IPA(cmudict), 음절 구분점(pyphen), 각종 id. (기계적)

  python3 tools/build-entries/build.py

이 구조 덕에 180개를 손으로 쓰지 않고도 발음·음절 오류 없이 확장한다.
생성 후 반드시 `npm run validate`로 검증한다.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from phonetics import ipa, syllables  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data/source/entries.src.json"
OVERRIDES = ROOT / "data/source/ipa-overrides.json"
OUT = ROOT / "data/entries.json"


def build_sense(entry_id: str, idx: int, s: dict, default_tags: list) -> dict:
    sense_id = f"{entry_id}-{idx}"
    out = {
        "id": sense_id,
        "pos": s["pos"],
        "en": s["def"],
        "ko": s["ko"],
        "level": s.get("level", 1),
        "tags": s.get("tags", default_tags),
    }
    examples = []
    for j, ex in enumerate(s["ex"], start=1):
        examples.append({"id": f"{sense_id}-e{j}", "en": ex[0], "ko": ex[1]})
    out["examples"] = examples

    if "colloc" in s:
        cols = []
        for j, c in enumerate(s["colloc"], start=1):
            text, ko, ex_idx = c
            cols.append({
                "id": f"{sense_id}-c{j}",
                "text": text,
                "ko": ko,
                "exampleId": f"{sense_id}-e{ex_idx}" if ex_idx else None,
                "level": s.get("level", 1),
                "studiable": True,
            })
            if cols[-1]["exampleId"] is None:
                del cols[-1]["exampleId"]
        out["collocations"] = cols

    if s.get("note"):
        out["note"] = s["note"]
    return out


def build_entry(entry_id: str, src: dict, overrides: dict) -> dict:
    hw = src.get("hw", entry_id)

    us_ipa = overrides.get(hw) or ipa(hw)
    if not us_ipa:
        raise SystemExit(
            f"발음 없음: '{hw}' — CMUdict에 없다. data/source/ipa-overrides.json에 추가하라."
        )

    entry: dict = {
        "id": entry_id,
        "headword": hw,
        "syllables": syllables(hw),
        "ipa": {"us": us_ipa},
        "audio": {"us": f"audio/us/{entry_id}.mp3"},
    }
    if src.get("ipa_uk"):
        entry["ipa"]["uk"] = src["ipa_uk"]
    if src.get("audio_uk"):
        entry["audio"]["uk"] = f"audio/uk/{entry_id}.mp3"
    if src.get("inf"):
        entry["inflections"] = src["inf"]

    default_tags = src.get("tags", [])
    if "senses" in src:
        senses = [
            build_sense(entry_id, i, s, default_tags)
            for i, s in enumerate(src["senses"], start=1)
        ]
    else:
        single = {k: src[k] for k in ("pos", "def", "ko", "ex") if k in src}
        for opt in ("level", "note", "colloc", "tags"):
            if opt in src:
                single[opt] = src[opt]
        senses = [build_sense(entry_id, 1, single, default_tags)]
    entry["senses"] = senses

    related = {}
    if src.get("syn"):
        related["synonyms"] = [{"entryId": e} for e in src["syn"]]
    if src.get("ant"):
        related["antonyms"] = [{"entryId": e} for e in src["ant"]]
    if src.get("family"):
        related["wordFamily"] = src["family"]
    if related:
        entry["related"] = related

    entry["curriculum"] = {"grade": src.get("grade", 3)}
    entry["editorialStatus"] = src.get("status", "done")
    return entry


def main() -> None:
    source = json.loads(SRC.read_text(encoding="utf-8"))
    overrides = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {}

    order = [k for k in source if not k.startswith("_")]
    entries = [build_entry(k, source[k], overrides) for k in order]
    entries.sort(key=lambda e: e["headword"])

    out = {
        "schemaVersion": 2,
        "contentVersion": source.get("_contentVersion", "0.2.0"),
        "_note": "data/source/entries.src.json에서 tools/build-entries/build.py로 생성. 직접 편집하지 말 것.",
        "entries": entries,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"생성: {OUT.relative_to(ROOT)} · 표제어 {len(entries)}")


if __name__ == "__main__":
    main()
