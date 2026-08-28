"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { generateNotes, INSTRUMENTS, OCTAVES, type Note } from "@/lib/notes";
import { useAudioEngine, type InstrumentType } from "@/hooks/useAudioEngine";
import { useMicrophone } from "@/hooks/useMicrophone";
import NoteKey from "./NoteKey";

const MicVisualizer = dynamic(() => import("./MicVisualizer"), { ssr: false });

export default function InstrumentPlayer() {
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>("flute");
  const [selectedOctave, setSelectedOctave] = useState<number>(4);
  const [pressedNotes, setPressedNotes] = useState<Set<string>>(new Set());
  const [micMode, setMicMode] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [showTip, setShowTip] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const pressedNotesRef = useRef<Set<string>>(new Set());
  const currentNoteRef = useRef<Note | null>(null);
  const micModeRef = useRef(false);

  const { startNote, stopNote, stopAllNotes } = useAudioEngine();

  const notes = generateNotes(selectedOctave);
  const naturalNotes = notes.filter((n) => !n.isSharp && !n.isFlat);
  const sharpNotes = notes.filter((n) => n.isSharp || n.isFlat);

  // 마이크 볼륨 콜백
  const handleBreath = useCallback(
    (volume: number) => {
      setMicVolume(volume);
      if (!micModeRef.current) return;

      // 현재 눌린 음표들에 소리 재생
      pressedNotesRef.current.forEach((noteId) => {
        const note = [...generateNotes(selectedOctave)].find(
          (n) => n.id === noteId
        );
        if (note) {
          const vol = Math.min(1, volume * 8);
          startNote(noteId, note.frequency, selectedInstrument, vol);
        }
      });
    },
    [selectedInstrument, selectedOctave, startNote]
  );

  const {
    isListening,
    volume: rawVolume,
    hasPermission,
    requestPermission,
    startListening,
    stopListening,
  } = useMicrophone(handleBreath, 0.025);

  useEffect(() => {
    micModeRef.current = micMode;
  }, [micMode]);

  useEffect(() => {
    pressedNotesRef.current = pressedNotes;
  }, [pressedNotes]);

  useEffect(() => {
    currentNoteRef.current = currentNote;
  }, [currentNote]);

  // 옥타브 변경시 소리 중지
  useEffect(() => {
    stopAllNotes();
    setPressedNotes(new Set());
    setCurrentNote(null);
  }, [selectedOctave, stopAllNotes]);

  const handleNotePress = useCallback(
    (note: Note) => {
      setShowTip(false);
      setCurrentNote(note);
      setPressedNotes((prev) => new Set([...prev, note.id]));

      if (!micMode) {
        // 직접 탭 모드: 바로 소리
        startNote(note.id, note.frequency, selectedInstrument, 0.7);
      }
      // 마이크 모드: useMicrophone 콜백이 처리
    },
    [micMode, selectedInstrument, startNote]
  );

  const handleNoteRelease = useCallback(
    (note: Note) => {
      setPressedNotes((prev) => {
        const next = new Set(prev);
        next.delete(note.id);
        return next;
      });
      if (!micMode) {
        stopNote(note.id, selectedInstrument);
      } else {
        stopNote(note.id, selectedInstrument);
      }
      if (currentNoteRef.current?.id === note.id) {
        setCurrentNote(null);
      }
    },
    [micMode, selectedInstrument, stopNote]
  );

  const toggleMicMode = useCallback(async () => {
    if (!micMode) {
      if (!hasPermission) {
        await requestPermission();
      }
      setMicMode(true);
      startListening();
    } else {
      setMicMode(false);
      stopListening();
      stopAllNotes();
      setPressedNotes(new Set());
      setMicVolume(0);
    }
  }, [micMode, hasPermission, requestPermission, startListening, stopListening, stopAllNotes]);

  const displayVolume = micMode ? rawVolume : 0;

  const selectedInstrumentInfo = INSTRUMENTS.find((i) => i.id === selectedInstrument);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e] overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 pt-safe pt-3 pb-2 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎵</span>
          <div>
            <h1 className="text-lg font-black text-white leading-none">나의악기</h1>
            <p className="text-[10px] text-purple-300">My Instrument</p>
          </div>
        </div>

        {/* 현재 연주 중인 음 표시 */}
        <div className="flex-1 mx-3">
          {currentNote ? (
            <div
              className="flex flex-col items-center py-1 px-3 rounded-xl border"
              style={{
                background: `${currentNote.color}22`,
                borderColor: `${currentNote.color}66`,
              }}
            >
              <span className="text-lg font-black leading-none" style={{ color: currentNote.color }}>
                {currentNote.korean}
              </span>
              <span className="text-[10px] text-white/60">{currentNote.name}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center py-1 px-3 rounded-xl border border-white/10 bg-white/5">
              <span className="text-xs text-white/30">대기 중</span>
            </div>
          )}
        </div>

        {/* 옥타브 선택 */}
        <div className="flex gap-1">
          {OCTAVES.map((oct) => (
            <button
              key={oct}
              onClick={() => setSelectedOctave(oct)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                selectedOctave === oct
                  ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                  : "bg-white/10 text-white/50 hover:bg-white/20"
              }`}
            >
              {oct}
            </button>
          ))}
        </div>
      </div>

      {/* 악기 선택 드롭다운 */}
      <div className="relative px-4 py-2 bg-black/10">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedInstrumentInfo?.emoji}</span>
            <span className="text-white font-semibold">{selectedInstrumentInfo?.name}</span>
          </div>
          <svg
            className={`w-4 h-4 text-white/60 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isDropdownOpen && (
          <div className="absolute left-4 right-4 top-full mt-1 z-50 rounded-xl bg-[#1a1a3e] border border-white/20 shadow-xl overflow-hidden">
            {INSTRUMENTS.map((inst) => (
              <button
                key={inst.id}
                onClick={() => {
                  setSelectedInstrument(inst.id as InstrumentType);
                  setIsDropdownOpen(false);
                  stopAllNotes();
                  setPressedNotes(new Set());
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-all text-left ${
                  selectedInstrument === inst.id
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-white/70"
                }`}
              >
                <span className="text-xl">{inst.emoji}</span>
                <span className="font-medium">{inst.name}</span>
                {selectedInstrument === inst.id && (
                  <svg className="w-4 h-4 ml-auto text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 연주 모드 안내 */}
      {showTip && (
        <div className="mx-4 mt-1 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
          <span className="text-sm">💡</span>
          <p className="text-[11px] text-blue-300">
            탭 모드: 버튼을 누르면 소리 | 마이크 모드: 버튼 누른 채 바람 불기
          </p>
        </div>
      )}

      {/* 건반 영역 */}
      <div className="flex-1 px-3 py-2 overflow-y-auto">
        {/* 샾 음표들 */}
        <div className="mb-2">
          <p className="text-[10px] text-purple-300/60 mb-1 px-1 font-medium">♯ 샾 / ♭ 플랫</p>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${sharpNotes.length}, 1fr)` }}>
            {sharpNotes.map((note) => (
              <NoteKey
                key={note.id}
                note={note}
                isPressed={pressedNotes.has(note.id)}
                isActive={micMode && isListening}
                onPress={handleNotePress}
                onRelease={handleNoteRelease}
              />
            ))}
          </div>
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] text-white/30">자연음</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* 자연음 */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${naturalNotes.length}, 1fr)` }}>
          {naturalNotes.map((note) => (
            <NoteKey
              key={note.id}
              note={note}
              isPressed={pressedNotes.has(note.id)}
              isActive={micMode && isListening}
              onPress={handleNotePress}
              onRelease={handleNoteRelease}
            />
          ))}
        </div>
      </div>

      {/* 마이크 영역 */}
      <div className="px-4 pb-safe pb-4 pt-2 bg-black/20 backdrop-blur-sm border-t border-white/10">
        {/* 볼륨 시각화 */}
        <div className="h-14 mb-3 rounded-2xl overflow-hidden border border-white/10">
          <MicVisualizer
            volume={displayVolume}
            isListening={isListening}
            isActive={micMode && pressedNotes.size > 0}
          />
        </div>

        {/* 마이크 컨트롤 */}
        <div className="flex items-center gap-3">
          {/* 마이크 모드 토글 */}
          <button
            onClick={toggleMicMode}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold
              transition-all duration-300
              ${
                micMode
                  ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30"
                  : "bg-white/10 text-white/60 hover:bg-white/15 border border-white/20"
              }
            `}
          >
            <span className="text-xl">{micMode ? "🎙️" : "🎙️"}</span>
            <span className="text-sm">
              {micMode ? "마이크 ON" : "마이크 모드"}
            </span>
            {micMode && (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            )}
          </button>

          {/* 볼륨 인디케이터 */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-0.5 items-end h-8">
              {[0.02, 0.04, 0.06, 0.09, 0.12, 0.16].map((threshold, i) => (
                <div
                  key={i}
                  className="w-2.5 rounded-t-sm transition-colors duration-75"
                  style={{
                    height: `${(i + 1) * 20}%`,
                    background:
                      displayVolume > threshold
                        ? i < 3
                          ? "#22c55e"
                          : i < 5
                          ? "#eab308"
                          : "#ef4444"
                        : "#374151",
                  }}
                />
              ))}
            </div>
            <span className="text-[9px] text-white/30">레벨</span>
          </div>

          {/* 권한 상태 */}
          {hasPermission === false && (
            <div className="text-[10px] text-red-400 text-center">
              마이크<br />거부됨
            </div>
          )}
        </div>

        {/* 사용법 안내 */}
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-white/30">
          <span>👆 탭하면 소리</span>
          <span>|</span>
          <span>🎙️ 마이크 ON + 탭 + 바람 불기</span>
        </div>
      </div>
    </div>
  );
}
