"""
발음·음절 생성 — 권위 데이터에서 IPA와 음절 구분을 뽑는다.

손으로 180개를 쓰면 오류가 나는 부분(IPA, 음절)을 여기서 생성한다.
- IPA(미국식): CMUdict의 ARPAbet + 강세를 IPA로 변환 (ADR-005: 미국식 기본)
- 음절 구분점(·): pyphen 하이픈 사전 (사전 관습의 철자 음절 분해)

판단이 필요한 부분(정의·예문·한국어)은 사람이 저작한다. 이 스크립트는 손대지 않는다.
"""

import cmudict
import pyphen

_CMU = cmudict.dict()
_HY = pyphen.Pyphen(lang="en_US")

# ARPAbet → IPA. 한국 학습사전이 쓰는 미국식 표기에 맞춘다 — 장음 ː, r음 유지.
_VOWEL = {
    "AA": "ɑː", "AE": "æ", "AH": "ʌ", "AO": "ɔː", "AW": "aʊ", "AY": "aɪ",
    "EH": "e", "EY": "eɪ", "IH": "ɪ", "IY": "iː", "OW": "oʊ", "OY": "ɔɪ",
    "UH": "ʊ", "UW": "uː",
    # ER/AH0 은 강세에 따라 갈린다. 아래에서 특별 처리.
}
_CONS = {
    "B": "b", "CH": "tʃ", "D": "d", "DH": "ð", "F": "f", "G": "ɡ", "HH": "h",
    "JH": "dʒ", "K": "k", "L": "l", "M": "m", "N": "n", "NG": "ŋ", "P": "p",
    "R": "r", "S": "s", "SH": "ʃ", "T": "t", "TH": "θ", "V": "v", "W": "w",
    "Y": "j", "Z": "z", "ZH": "ʒ",
}
# 단일 자음 음소만 온셋으로 넘긴다(최대 온셋의 안전한 근사). 초등 어휘는 대부분 1~2음절.


def _phone_ipa(p: str) -> tuple[str, int]:
    """음소 하나 → (IPA, 강세). 강세: 0 없음, 1 1차, 2 2차."""
    stress = 0
    if p[-1].isdigit():
        stress = int(p[-1])
        base = p[:-1]
    else:
        base = p

    if base == "ER":
        return ("ɜːr" if stress else "ɚ", stress)
    if base == "AH":
        return ("ʌ" if stress else "ə", stress)
    if base in _VOWEL:
        return (_VOWEL[base], stress)
    return (_CONS.get(base, ""), stress)


def _is_vowel(p: str) -> bool:
    return p[-1].isdigit()


def ipa(word: str) -> str | None:
    """CMUdict 기반 미국식 IPA. 음절 경계(.)와 강세(ˈ ˌ)를 넣는다."""
    prons = _CMU.get(word.lower())
    if not prons:
        return None
    phones = prons[0]

    # 음절 나누기: 모음을 핵으로, 자음 하나를 다음 음절 온셋으로 넘긴다.
    nuclei = [i for i, p in enumerate(phones) if _is_vowel(p)]
    if not nuclei:
        return None
    bounds = []  # 각 음절 (start, end)
    prev = 0
    for k in range(len(nuclei) - 1):
        v, nxt = nuclei[k], nuclei[k + 1]
        n_cons = nxt - v - 1  # 두 모음 사이 자음 수
        # 최대 온셋 근사: 자음이 있으면 마지막 1개만 다음 음절 온셋으로, 나머지는 앞 코다로
        split = nxt - 1 if n_cons >= 1 else nxt
        bounds.append((prev, split))
        prev = split
    bounds.append((prev, len(phones)))

    single = len(bounds) == 1
    out = []
    for start, end in bounds:
        syl = phones[start:end]
        stress = max((int(p[-1]) for p in syl if p[-1].isdigit()), default=0)
        # 단음절 단어에는 강세 기호를 쓰지 않는다
        mark = "" if single else "ˈ" if stress == 1 else "ˌ" if stress == 2 else ""
        body = "".join(_phone_ipa(p)[0] for p in syl)
        out.append(mark + body)
    return "/" + ".".join(out) + "/"


def syllables(word: str) -> str:
    """철자 음절 구분점. pyphen 하이픈 위치에 · 를 넣는다."""
    return _HY.inserted(word, hyphen="·")


if __name__ == "__main__":
    import json
    import sys

    entries = json.load(open(sys.argv[1]))["entries"]
    print(f"{'headword':<12}{'현재 IPA':<18}{'생성 IPA':<18}{'현재 음절':<14}{'생성 음절'}")
    print("─" * 74)
    for e in entries:
        w = e["headword"]
        gi = ipa(w) or "(CMUdict 없음)"
        gs = syllables(w)
        cur_i = e["ipa"]["us"]
        cur_s = e["syllables"]
        flag = "" if gs == cur_s else "  ⚠음절차이"
        print(f"{w:<12}{cur_i:<18}{gi:<18}{cur_s:<14}{gs}{flag}")
