"use client";

import { useRef, useCallback } from "react";

export type InstrumentType =
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

// 악기별 음색 설정
const INSTRUMENT_CONFIGS: Record<
  InstrumentType,
  {
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
> = {
  flute: {
    type: "sine",
    harmonics: [
      { ratio: 1, gain: 1.0 },
      { ratio: 2, gain: 0.3 },
      { ratio: 3, gain: 0.08 },
    ],
    attack: 0.08,
    decay: 0.1,
    sustain: 0.85,
    release: 0.15,
    filterFreq: 3000,
    filterQ: 0.7,
    filterType: "lowpass",
    vibrato: true,
    vibratoRate: 5.5,
    vibratoDepth: 3,
  },
  recorder: {
    type: "square",
    harmonics: [
      { ratio: 1, gain: 0.8 },
      { ratio: 2, gain: 0.4 },
      { ratio: 3, gain: 0.15 },
      { ratio: 4, gain: 0.05 },
    ],
    attack: 0.03,
    decay: 0.05,
    sustain: 0.9,
    release: 0.1,
    filterFreq: 2500,
    filterQ: 1.2,
    filterType: "lowpass",
    vibrato: false,
    vibratoRate: 0,
    vibratoDepth: 0,
  },
  ocarina: {
    type: "sine",
    harmonics: [
      { ratio: 1, gain: 1.0 },
      { ratio: 2, gain: 0.15 },
      { ratio: 3, gain: 0.05 },
    ],
    attack: 0.1,
    decay: 0.15,
    sustain: 0.8,
    release: 0.2,
    filterFreq: 2000,
    filterQ: 0.5,
    filterType: "lowpass",
    vibrato: true,
    vibratoRate: 5,
    vibratoDepth: 2,
  },
  saxophone: {
    type: "sawtooth",
    harmonics: [
      { ratio: 1, gain: 0.9 },
      { ratio: 2, gain: 0.5 },
      { ratio: 3, gain: 0.3 },
      { ratio: 4, gain: 0.15 },
      { ratio: 5, gain: 0.08 },
    ],
    attack: 0.05,
    decay: 0.1,
    sustain: 0.85,
    release: 0.12,
    filterFreq: 1500,
    filterQ: 2.0,
    filterType: "bandpass",
    vibrato: true,
    vibratoRate: 6,
    vibratoDepth: 4,
  },
  trumpet: {
    type: "sawtooth",
    harmonics: [
      { ratio: 1, gain: 0.7 },
      { ratio: 2, gain: 0.6 },
      { ratio: 3, gain: 0.4 },
      { ratio: 4, gain: 0.2 },
      { ratio: 5, gain: 0.1 },
      { ratio: 6, gain: 0.05 },
    ],
    attack: 0.04,
    decay: 0.08,
    sustain: 0.9,
    release: 0.1,
    filterFreq: 2000,
    filterQ: 3.0,
    filterType: "bandpass",
    vibrato: false,
    vibratoRate: 0,
    vibratoDepth: 0,
  },
  violin: {
    type: "sawtooth",
    harmonics: [
      { ratio: 1, gain: 0.8 },
      { ratio: 2, gain: 0.6 },
      { ratio: 3, gain: 0.35 },
      { ratio: 4, gain: 0.2 },
      { ratio: 5, gain: 0.1 },
    ],
    attack: 0.15,
    decay: 0.1,
    sustain: 0.9,
    release: 0.25,
    filterFreq: 1800,
    filterQ: 1.5,
    filterType: "lowpass",
    vibrato: true,
    vibratoRate: 6.5,
    vibratoDepth: 6,
  },
  clarinet: {
    type: "square",
    harmonics: [
      { ratio: 1, gain: 1.0 },
      { ratio: 3, gain: 0.5 },
      { ratio: 5, gain: 0.25 },
      { ratio: 7, gain: 0.1 },
    ],
    attack: 0.04,
    decay: 0.08,
    sustain: 0.88,
    release: 0.12,
    filterFreq: 1200,
    filterQ: 1.5,
    filterType: "lowpass",
    vibrato: true,
    vibratoRate: 5,
    vibratoDepth: 3,
  },
  harmonica: {
    type: "sawtooth",
    harmonics: [
      { ratio: 1, gain: 0.9 },
      { ratio: 2, gain: 0.4 },
      { ratio: 3, gain: 0.2 },
      { ratio: 4, gain: 0.1 },
    ],
    attack: 0.02,
    decay: 0.05,
    sustain: 0.95,
    release: 0.08,
    filterFreq: 1000,
    filterQ: 2.0,
    filterType: "bandpass",
    vibrato: true,
    vibratoRate: 7,
    vibratoDepth: 5,
  },
};

export function useAudioEngine() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeNotesRef = useRef<Map<string, ActiveNote>>(new Map());

  const getAudioContext = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const startNote = useCallback(
    (noteKey: string, frequency: number, instrument: InstrumentType, volume: number = 0.7) => {
      const ctx = getAudioContext();
      const config = INSTRUMENT_CONFIGS[instrument];

      // 이미 재생 중이면 중지 후 재시작
      if (activeNotesRef.current.has(noteKey)) {
        stopNote(noteKey);
      }

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      const filterNode = ctx.createBiquadFilter();

      filterNode.type = config.filterType;
      filterNode.frequency.value = config.filterFreq;
      filterNode.Q.value = config.filterQ;

      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(
        volume * config.sustain,
        now + config.attack
      );
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

        // 바이브라토
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getAudioContext]
  );

  const stopNote = useCallback((noteKey: string) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const activeNote = activeNotesRef.current.get(noteKey);
    if (!activeNote) return;

    const now = ctx.currentTime;
    const instrument = "flute"; // default release
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

  const stopNoteWithRelease = useCallback((noteKey: string, instrument: InstrumentType) => {
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

  const stopAllNotes = useCallback(() => {
    activeNotesRef.current.forEach((_, key) => {
      stopNote(key);
    });
  }, [stopNote]);

  return { startNote, stopNote: stopNoteWithRelease, stopAllNotes };
}
