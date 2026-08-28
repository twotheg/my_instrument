"use client";

import React, { useCallback } from "react";
import type { Note } from "@/lib/notes";

interface NoteKeyProps {
  note: Note;
  isPressed: boolean;
  isActive: boolean; // 마이크로 바람 불기 활성화 상태
  onPress: (note: Note) => void;
  onRelease: (note: Note) => void;
}

export default function NoteKey({
  note,
  isPressed,
  isActive,
  onPress,
  onRelease,
}: NoteKeyProps) {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onPress(note);
    },
    [note, onPress]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      onRelease(note);
    },
    [note, onRelease]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      onRelease(note);
    },
    [note, onRelease]
  );

  const isNatural = !note.isSharp && !note.isFlat;

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(e) => e.preventDefault()}
      className={`
        relative select-none touch-none
        flex flex-col items-center justify-center
        font-bold transition-all duration-75
        ${
          isNatural
            ? `rounded-2xl shadow-lg ${
                isPressed
                  ? "scale-95 shadow-inner"
                  : "hover:brightness-110 active:scale-95"
              }`
            : `rounded-xl shadow-md ${
                isPressed
                  ? "scale-95 shadow-inner"
                  : "hover:brightness-110 active:scale-95"
              }`
        }
        ${isNatural ? "w-full h-28" : "w-full h-20"}
        overflow-hidden
      `}
      style={{
        background: isPressed
          ? `radial-gradient(circle at center, white 0%, ${note.color} 60%)`
          : isNatural
          ? `linear-gradient(160deg, ${note.color}dd 0%, ${note.color}88 100%)`
          : `linear-gradient(160deg, ${note.color}aa 0%, ${note.color}66 100%)`,
        border: `2px solid ${isPressed ? "white" : note.color}`,
        boxShadow: isPressed
          ? `0 0 20px ${note.color}88, inset 0 2px 4px rgba(0,0,0,0.3)`
          : `0 4px 15px ${note.color}44`,
      }}
      aria-label={note.koreanFull}
      aria-pressed={isPressed}
    >
      {/* 빛나는 효과 */}
      {isPressed && (
        <div
          className="absolute inset-0 rounded-2xl animate-pulse"
          style={{
            background: `radial-gradient(circle at center, ${note.color}66 0%, transparent 70%)`,
          }}
        />
      )}

      {/* 계이름 */}
      <span
        className={`
          relative z-10 leading-tight text-center drop-shadow-lg
          ${isNatural ? "text-2xl" : "text-lg"}
          ${isPressed ? "text-gray-900" : "text-white"}
          font-black
        `}
      >
        {note.korean}
      </span>

      {/* 음표 이름 */}
      <span
        className={`
          relative z-10 leading-tight
          ${isNatural ? "text-xs" : "text-[10px]"}
          ${isPressed ? "text-gray-700" : "text-white/70"}
          font-medium mt-0.5
        `}
      >
        {note.name}
      </span>

      {/* 활성 인디케이터 */}
      {isActive && !isPressed && (
        <div
          className="absolute bottom-1 w-1.5 h-1.5 rounded-full animate-bounce"
          style={{ background: note.color }}
        />
      )}
    </button>
  );
}
