"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface UseMicrophoneReturn {
  isListening: boolean;
  volume: number;
  hasPermission: boolean | null;
  requestPermission: () => Promise<void>;
  startListening: () => void;
  stopListening: () => void;
}

export function useMicrophone(
  onBreath: (volume: number) => void,
  threshold: number = 0.03
): UseMicrophoneReturn {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isListeningRef = useRef(false);
  const onBreathRef = useRef(onBreath);

  useEffect(() => {
    onBreathRef.current = onBreath;
  }, [onBreath]);

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;
      setHasPermission(true);

      // AudioContext 생성
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;
    } catch {
      setHasPermission(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (!analyserRef.current) return;
    isListeningRef.current = true;
    setIsListening(true);

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const tick = () => {
      if (!isListeningRef.current) return;

      analyser.getByteTimeDomainData(dataArray);

      // RMS 계산
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / bufferLength);

      setVolume(rms);
      if (rms > threshold) {
        onBreathRef.current(rms);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [threshold]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setVolume(0);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [stopListening]);

  return {
    isListening,
    volume,
    hasPermission,
    requestPermission,
    startListening,
    stopListening,
  };
}
