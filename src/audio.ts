/**
 * 발음 재생. 녹음 오디오(audio.us)를 우선 쓰고, 없거나 실패하면
 * 브라우저 음성합성으로 대체한다 (ADR-004).
 *
 * 재생 실패를 전제로 한다 — 자동재생 정책·무음 모드로 실패할 수 있으므로
 * 이 함수는 성공/실패 여부를 반환하고, 호출부가 "다시 듣기" 버튼을 항상 남긴다.
 */

const BASE = import.meta.env.BASE_URL;
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

function speak(text: string): void {
  if (!canSpeak) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/** 표제어/단어를 소리 낸다. 오디오 파일이 있으면 그것을, 없으면 TTS. */
export async function playWord(word: string, audioPath?: string): Promise<void> {
  if (audioPath) {
    try {
      const audio = new Audio(BASE + audioPath);
      await audio.play();
      return;
    } catch {
      // 파일이 아직 없거나(생성 전) 재생이 막힌 경우 TTS로 넘어간다
    }
  }
  speak(word);
}

export const audioAvailable = canSpeak;
