"""
발음 오디오 생성 — 표제어마다 미국식 발음 mp3를 만든다 (ADR-004, ADR-005).

  python3 tools/audio/generate.py            # 없는 것만 생성 (증분)
  python3 tools/audio/generate.py --force    # 전부 다시 생성

엔진: Piper (MIT). 음성: en_US-lessac-medium (오프라인, API 키 불필요).
출력물은 자유롭게 재배포 가능하다. 상세는 ADR-004.

WAV(Piper) → mp3(ffmpeg). 발음이 1순위 문제(P2)이므로 런타임 TTS가 아니라
빌드 타임에 생성해 번들한다. 파일이 없는 표제어는 앱이 Web Speech로 대체한다.
"""

import argparse
import io
import subprocess
import sys
import wave
from pathlib import Path

import imageio_ffmpeg
from piper import PiperVoice

ROOT = Path(__file__).resolve().parents[2]
VOICE = ROOT / "tools/audio/voices/en_US-lessac-medium.onnx"
ENTRIES = ROOT / "data/entries.json"
OUT_DIR = ROOT / "public/audio/us"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def synth_wav_bytes(voice: PiperVoice, text: str) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        voice.synthesize_wav(text, wf)
    return buf.getvalue()


def wav_to_mp3(wav: bytes, out_path: Path) -> None:
    # qscale 4 = VBR ~128k 상당. 짧은 낱말이라 파일당 수 KB.
    proc = subprocess.run(
        [FFMPEG, "-y", "-loglevel", "error", "-i", "pipe:0",
         "-codec:a", "libmp3lame", "-qscale:a", "5", str(out_path)],
        input=wav, capture_output=True,
    )
    if proc.returncode != 0:
        raise SystemExit(f"ffmpeg 실패 ({out_path.name}): {proc.stderr.decode()[:300]}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="이미 있는 파일도 다시 생성")
    args = ap.parse_args()

    if not VOICE.exists():
        raise SystemExit(
            f"음성 모델 없음: {VOICE.relative_to(ROOT)}\n"
            f"  cd tools/audio/voices && python3 -m piper.download_voices en_US-lessac-medium"
        )

    import json
    entries = json.loads(ENTRIES.read_text(encoding="utf-8"))["entries"]
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"음성 로드: {VOICE.name}")
    voice = PiperVoice.load(str(VOICE))

    made, skipped = 0, 0
    total_bytes = 0
    for e in entries:
        out = OUT_DIR / f"{e['id']}.mp3"
        if out.exists() and not args.force:
            skipped += 1
            continue
        wav = synth_wav_bytes(voice, e["headword"])
        wav_to_mp3(wav, out)
        total_bytes += out.stat().st_size
        made += 1
        print(f"  {e['headword']:<14} → {out.relative_to(ROOT)}")

    print(
        f"\n생성 {made} · 건너뜀 {skipped}"
        + (f" · 새 파일 {total_bytes / 1024:.0f} KB" if made else "")
    )


if __name__ == "__main__":
    main()
