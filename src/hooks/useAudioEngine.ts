import { useRef, useCallback } from "react";

export type InstrumentType =
  | "piano"
  | "flute"
  | "recorder"
  | "ocarina"
  | "saxophone"
  | "trumpet"
  | "violin"
  | "clarinet"
  | "harmonica";

interface ActiveNote {
  oscillators: OscillatorNode[];
  gainNode: GainNode;
  filterNode: BiquadFilterNode;
}

interface InstrumentConfig {
  type: OscillatorType;
  harmonics: { ratio: number; gain: number }[];
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterFreq: number;
  filterQ: number;
  filterType: BiquadFilterType;
  vibrato: boolean;
  vibratoRate: number;
  vibratoDepth: number;
}

const INSTRUMENT_CONFIGS: Record<InstrumentType, InstrumentConfig> = {
  // 건반악기 — 타격 후 바로 자연 감쇠, 바이브라토 없음
  piano: {
    type: "triangle",
    harmonics: [
      { ratio: 1, gain: 1.0 },
      { ratio: 2, gain: 0.55 },
      { ratio: 3, gain: 0.28 },
      { ratio: 4, gain: 0.14 },
      { ratio: 5, gain: 0.07 },
      { ratio: 6, gain: 0.03 },
    ],
    attack: 0.004,
    decay: 0.35,
    sustain: 0.38,
    release: 0.45,
    filterFreq: 5500,
    filterQ: 0.5,
    filterType: "lowpass",
    vibrato: false,
    vibratoRate: 0,
    vibratoDepth: 0,
  },
  // 맑고 부드러운 사인파 + 바이브라토
  flute: {
    type: "sine",
    harmonics: [
      { ratio: 1, gain: 1.0 },
      { ratio: 2, gain: 0.22 },
      { ratio: 3, gain: 0.05 },
    ],
    attack: 0.09,
    decay: 0.1,
    sustain: 0.85,
    release: 0.18,
    filterFreq: 3200,
    filterQ: 0.7,
    filterType: "lowpass",
    vibrato: true,
    vibratoRate: 5.2,
    vibratoDepth: 2.5,
  },
  // 학교 음악 시간 리코더 — 스퀘어파 기반, 바이브라토 없이 또렷하게
  recorder: {
    type: "square",
    harmonics: [
      { ratio: 1, gain: 0.85 },
      { ratio: 2, gain: 0.3 },
      { ratio: 3, gain: 0.12 },
      { ratio: 4, gain: 0.04 },
    ],
    attack: 0.02,
    decay: 0.04,
    sustain: 0.92,
    release: 0.08,
    filterFreq: 3600,
    filterQ: 1.4,
    filterType: "lowpass",
    vibrato: false,
    vibratoRate: 0,
    vibratoDepth: 0,
  },
  // 토토로 느낌 — 거의 순수한 사인파
  ocarina: {
    type: "sine",
    harmonics: [
      { ratio: 1, gain: 1.0 },
      { ratio: 2, gain: 0.08 },
    ],
    attack: 0.11,
    decay: 0.12,
    sustain: 0.82,
    release: 0.22,
    filterFreq: 1800,
    filterQ: 0.5,
    filterType: "lowpass",
    vibrato: true,
    vibratoRate: 4.6,
    vibratoDepth: 2.2,
  },
  // 재즈 색소폰 — 톱니파 + 리드 특유의 공명(bandpass) + 바이브라토
  saxophone: {
    type: "sawtooth",
    harmonics: [
      { ratio: 1, gain: 0.85 },
      { ratio: 2, gain: 0.55 },
      { ratio: 3, gain: 0.35 },
      { ratio: 4, gain: 0.18 },
      { ratio: 5, gain: 0.1 },
    ],
    attack: 0.07,
    decay: 0.1,
    sustain: 0.85,
    release: 0.14,
    filterFreq: 1100,
    filterQ: 2.4,
    filterType: "bandpass",
    vibrato: true,
    vibratoRate: 5.8,
    vibratoDepth: 5,
  },
  // 밝고 강렬한 금관 — 상단 배음이 강한 톱니파 + 좁은 공명
  trumpet: {
    type: "sawtooth",
    harmonics: [
      { ratio: 1, gain: 0.65 },
      { ratio: 2, gain: 0.6 },
      { ratio: 3, gain: 0.45 },
      { ratio: 4, gain: 0.28 },
      { ratio: 5, gain: 0.15 },
      { ratio: 6, gain: 0.08 },
    ],
    attack: 0.025,
    decay: 0.06,
    sustain: 0.92,
    release: 0.09,
    filterFreq: 2600,
    filterQ: 3.5,
    filterType: "bandpass",
    vibrato: false,
    vibratoRate: 0,
    vibratoDepth: 0,
  },
  // 현악기 — 느린 어택(활 긋는 느낌) + 바이브라토
  violin: {
    type: "sawtooth",
    harmonics: [
      { ratio: 1, gain: 0.8 },
      { ratio: 2, gain: 0.6 },
      { ratio: 3, gain: 0.38 },
      { ratio: 4, gain: 0.22 },
      { ratio: 5, gain: 0.12 },
    ],
    attack: 0.18,
    decay: 0.1,
    sustain: 0.9,
    release: 0.28,
    filterFreq: 2200,
    filterQ: 1.3,
    filterType: "lowpass",
    vibrato: true,
    vibratoRate: 6.2,
    vibratoDepth: 6.5,
  },
  // 홀수 배음만 사용한 특유의 목관(클라리넷) 음색
  clarinet: {
    type: "square",
    harmonics: [
      { ratio: 1, gain: 1.0 },
      { ratio: 3, gain: 0.55 },
      { ratio: 5, gain: 0.28 },
      { ratio: 7, gain: 0.12 },
    ],
    attack: 0.035,
    decay: 0.07,
    sustain: 0.88,
    release: 0.12,
    filterFreq: 1400,
    filterQ: 1.3,
    filterType: "lowpass",
    vibrato: true,
    vibratoRate: 4.8,
    vibratoDepth: 2.5,
  },
  // 입김 악기 느낌 — 리드 특유의 떨림(빠른 바이브라토)과 공명
  harmonica: {
    type: "sawtooth",
    harmonics: [
      { ratio: 1, gain: 0.85 },
      { ratio: 2, gain: 0.45 },
      { ratio: 3, gain: 0.25 },
      { ratio: 4, gain: 0.12 },
    ],
    attack: 0.015,
    decay: 0.04,
    sustain: 0.95,
    release: 0.07,
    filterFreq: 1300,
    filterQ: 2.6,
    filterType: "bandpass",
    vibrato: true,
    vibratoRate: 7.5,
    vibratoDepth: 4,
  },
};

export function useAudioEngine() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeNotesRef = useRef<Map<string, ActiveNote>>(new Map());

  const getAudioContext = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const stopNote = useCallback((noteKey: string, instrument: InstrumentType = "flute") => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const activeNote = activeNotesRef.current.get(noteKey);
    if (!activeNote) return;

    const now = ctx.currentTime;
    const release = INSTRUMENT_CONFIGS[instrument].release;

    activeNote.gainNode.gain.cancelScheduledValues(now);
    activeNote.gainNode.gain.setValueAtTime(activeNote.gainNode.gain.value, now);
    activeNote.gainNode.gain.linearRampToValueAtTime(0, now + release);

    setTimeout(() => {
      activeNote.oscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      });
      try {
        activeNote.gainNode.disconnect();
        activeNote.filterNode.disconnect();
      } catch {
        // ignore
      }
    }, (release + 0.1) * 1000);

    activeNotesRef.current.delete(noteKey);
  }, []);

  const startNote = useCallback(
    (noteKey: string, frequency: number, instrument: InstrumentType, volume: number = 0.7) => {
      const ctx = getAudioContext();
      const config = INSTRUMENT_CONFIGS[instrument];

      if (activeNotesRef.current.has(noteKey)) {
        stopNote(noteKey, instrument);
      }

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      const filterNode = ctx.createBiquadFilter();
      filterNode.type = config.filterType;
      filterNode.frequency.value = config.filterFreq;
      filterNode.Q.value = config.filterQ;

      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(volume * config.sustain, now + config.attack);
      masterGain.gain.linearRampToValueAtTime(
        volume * config.sustain,
        now + config.attack + config.decay
      );

      filterNode.connect(masterGain);
      masterGain.connect(ctx.destination);

      const oscillators: OscillatorNode[] = [];

      config.harmonics.forEach(({ ratio, gain: harmonicGain }) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = ratio === 1 ? config.type : "sine";
        osc.frequency.value = frequency * ratio;
        oscGain.gain.value = harmonicGain * 0.4;

        if (config.vibrato && config.vibratoRate > 0) {
          const vibratoOsc = ctx.createOscillator();
          const vibratoGain = ctx.createGain();
          vibratoOsc.frequency.value = config.vibratoRate;
          vibratoGain.gain.value = config.vibratoDepth;
          vibratoOsc.connect(vibratoGain);
          vibratoGain.connect(osc.frequency);
          vibratoOsc.start(now + config.attack + config.decay);
          oscillators.push(vibratoOsc);
        }

        osc.connect(oscGain);
        oscGain.connect(filterNode);
        osc.start(now);
        oscillators.push(osc);
      });

      activeNotesRef.current.set(noteKey, {
        oscillators,
        gainNode: masterGain,
        filterNode,
      });
    },
    [getAudioContext, stopNote]
  );

  const stopAllNotes = useCallback(() => {
    activeNotesRef.current.forEach((_, key) => {
      stopNote(key);
    });
  }, [stopNote]);

  return { startNote, stopNote, stopAllNotes };
}
