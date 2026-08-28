import { useState, useCallback, useRef, useEffect } from "react";
import { generateNotes, INSTRUMENTS, OCTAVES, type Note } from "./lib/notes";
import { useAudioEngine, type InstrumentType } from "./hooks/useAudioEngine";
import { useMicrophone } from "./hooks/useMicrophone";

// ─── PWA Install Hook ───────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function usePWAInstall() {
  const [installable, setInstallable] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPromptRef.current) return;
    await deferredPromptRef.current.prompt();
    const result = await deferredPromptRef.current.userChoice;
    if (result.outcome === "accepted") {
      setInstallable(false);
      deferredPromptRef.current = null;
    }
  }, []);

  return { installable, install };
}

// ─── Volume Bar ──────────────────────────────────────────────────────
function VolumeBar({ volume, isActive }: { volume: number; isActive: boolean }) {
  const bars = 8;
  const filled = Math.min(bars, Math.floor(volume * bars * 6));
  return (
    <div className="flex items-end gap-px">
      {Array.from({ length: bars }).map((_, i) => {
        const isOn = i < filled;
        const color = i < 4 ? "#22c55e" : i < 6 ? "#eab308" : "#ef4444";
        return (
          <div
            key={i}
            className="w-1.5 rounded-sm transition-all duration-75"
            style={{
              height: `${10 + i * 3}px`,
              backgroundColor: isActive && isOn ? color : "rgba(255,255,255,0.15)",
              boxShadow: isActive && isOn ? `0 0 4px ${color}88` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────
export default function App() {
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>("flute");
  const [selectedOctave, setSelectedOctave] = useState<number>(4);
  const [pressedNotes, setPressedNotes] = useState<Set<string>>(new Set());
  const [micMode, setMicMode] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [showInstrumentMenu, setShowInstrumentMenu] = useState(false);

  const pressedNotesRef = useRef<Set<string>>(new Set());
  const currentNoteRef = useRef<Note | null>(null);
  const micModeRef = useRef(false);

  const { startNote, stopNote, stopAllNotes } = useAudioEngine();
  const { installable, install } = usePWAInstall();

  const notes = generateNotes(selectedOctave);
  const naturalNotes = notes.filter((n) => !n.isSharp && !n.isFlat);
  const sharpNotes = notes.filter((n) => n.isSharp || n.isFlat);

  const handleBreath = useCallback(
    (volume: number) => {
      if (!micModeRef.current) return;
      pressedNotesRef.current.forEach((noteId) => {
        const note = generateNotes(selectedOctave).find((n) => n.id === noteId);
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

  useEffect(() => { micModeRef.current = micMode; }, [micMode]);
  useEffect(() => { pressedNotesRef.current = pressedNotes; }, [pressedNotes]);
  useEffect(() => { currentNoteRef.current = currentNote; }, [currentNote]);

  useEffect(() => {
    stopAllNotes();
    setPressedNotes(new Set());
    setCurrentNote(null);
  }, [selectedOctave, stopAllNotes]);

  const handleNotePress = useCallback(
    (note: Note) => {
      setCurrentNote(note);
      setPressedNotes((prev) => new Set([...prev, note.id]));
      if (!micMode) {
        startNote(note.id, note.frequency, selectedInstrument, 0.7);
      }
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
      stopNote(note.id, selectedInstrument);
      if (currentNoteRef.current?.id === note.id) {
        setCurrentNote(null);
      }
    },
    [selectedInstrument, stopNote]
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
    }
  }, [micMode, hasPermission, requestPermission, startListening, stopListening, stopAllNotes]);

  const selectedInstrumentInfo = INSTRUMENTS.find((i) => i.id === selectedInstrument);
  const displayVolume = micMode ? rawVolume : 0;

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #0d0b26 0%, #16133d 40%, #1a1240 70%, #0f0c29 100%)",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      onClick={() => setShowInstrumentMenu(false)}
    >
      {/* ═══ HEADER ═══ */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-2 py-1"
        style={{
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          minHeight: "48px",
        }}
      >
        {/* 왼쪽: 로고 + 현재 음 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🎵</span>
            <div className="leading-none">
              <div className="text-white font-bold" style={{ fontSize: "13px" }}>나의악기</div>
              <div className="text-purple-400" style={{ fontSize: "9px" }}>My Instrument</div>
            </div>
          </div>

          {/* 현재 연주 중인 음 */}
          {currentNote ? (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg"
              style={{ background: `${currentNote.color}22`, border: `1px solid ${currentNote.color}55` }}
            >
              <span className="font-black text-sm" style={{ color: currentNote.color }}>
                {currentNote.korean}
              </span>
              <span className="text-xs text-gray-400">{currentNote.name}</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <span className="text-xs text-gray-500">대기 중</span>
            </div>
          )}
        </div>

        {/* 오른쪽: 컨트롤들 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* PWA 설치 버튼 */}
          {installable && showInstallBanner && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-white"
              style={{
                background: "linear-gradient(90deg, #7c3aed88, #2563eb88)",
                border: "1px solid rgba(124,58,237,0.5)",
                boxShadow: "0 0 10px rgba(124,58,237,0.3)",
              }}
            >
              <button onClick={(e) => { e.stopPropagation(); install(); }} className="flex items-center gap-1">
                📲 <span>설치</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowInstallBanner(false); }}
                className="text-white/50 hover:text-white ml-0.5"
                style={{ fontSize: "10px" }}
              >
                ✕
              </button>
            </div>
          )}

          {/* 옥타브 */}
          <div className="flex items-center gap-0.5">
            <span className="text-gray-500 mr-0.5" style={{ fontSize: "9px" }}>OCT</span>
            {OCTAVES.map((oct) => (
              <button
                key={oct}
                onClick={() => setSelectedOctave(oct)}
                className="rounded-md font-bold transition-all"
                style={{
                  width: "24px",
                  height: "24px",
                  fontSize: "11px",
                  background: selectedOctave === oct
                    ? "linear-gradient(135deg, #7c3aed, #2563eb)"
                    : "rgba(255,255,255,0.08)",
                  color: selectedOctave === oct ? "white" : "#6b7280",
                  boxShadow: selectedOctave === oct ? "0 0 8px rgba(124,58,237,0.5)" : "none",
                  border: selectedOctave === oct ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {oct}
              </button>
            ))}
          </div>

          {/* 악기 선택 드롭다운 */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowInstrumentMenu((v) => !v)}
              className="flex items-center gap-1 rounded-lg font-semibold text-white transition-all"
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.12)",
                whiteSpace: "nowrap",
              }}
            >
              <span>{selectedInstrumentInfo?.emoji}</span>
              <span>{selectedInstrumentInfo?.name}</span>
              <span className="text-gray-400" style={{ fontSize: "8px" }}>{showInstrumentMenu ? "▲" : "▼"}</span>
            </button>

            {showInstrumentMenu && (
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
                style={{
                  background: "rgba(10,8,30,0.98)",
                  border: "1px solid rgba(124,58,237,0.35)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
                  minWidth: "130px",
                  backdropFilter: "blur(20px)",
                }}
              >
                {INSTRUMENTS.map((inst, idx) => (
                  <button
                    key={inst.id}
                    onClick={() => { setSelectedInstrument(inst.id as InstrumentType); setShowInstrumentMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-all"
                    style={{
                      fontSize: "11px",
                      background: selectedInstrument === inst.id ? "rgba(124,58,237,0.25)" : "transparent",
                      color: selectedInstrument === inst.id ? "white" : "#9ca3af",
                      borderBottom: idx < INSTRUMENTS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    <span>{inst.emoji}</span>
                    <span className="font-medium">{inst.name}</span>
                    {selectedInstrument === inst.id && <span className="ml-auto text-purple-400">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 모드 토글 버튼 */}
          <button
            onClick={toggleMicMode}
            className="flex items-center gap-1 rounded-lg font-bold transition-all"
            style={{
              padding: "4px 10px",
              fontSize: "11px",
              background: micMode
                ? "linear-gradient(135deg, #dc2626, #991b1b)"
                : "linear-gradient(135deg, #7c3aed44, #2563eb44)",
              color: micMode ? "white" : "#a78bfa",
              border: micMode
                ? "1px solid rgba(239,68,68,0.6)"
                : "1px solid rgba(124,58,237,0.3)",
              boxShadow: micMode ? "0 0 12px rgba(239,68,68,0.4)" : "0 0 8px rgba(124,58,237,0.2)",
              whiteSpace: "nowrap",
            }}
          >
            {micMode ? (
              <><span className="animate-pulse">🎙️</span><span>마이크</span></>
            ) : (
              <><span>👆</span><span>탭</span></>
            )}
          </button>

          {/* 마이크 볼륨 시각화 */}
          {micMode && <VolumeBar volume={displayVolume} isActive={isListening} />}
        </div>
      </header>

      {/* ═══ MODE BANNER ═══ */}
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          height: "22px",
          background: micMode
            ? "linear-gradient(90deg, rgba(220,38,38,0.12), rgba(185,28,28,0.18), rgba(220,38,38,0.12))"
            : "linear-gradient(90deg, rgba(124,58,237,0.08), rgba(37,99,235,0.12), rgba(124,58,237,0.08))",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {micMode ? (
          <span style={{ fontSize: "10px", color: "#fca5a5" }}>
            🎙️ <strong>마이크 모드</strong> — 건반 누른 채 마이크에 바람을 불어주세요
            {hasPermission === false && <span style={{ color: "#f87171", marginLeft: "6px" }}>⚠️ 마이크 권한 거부됨</span>}
          </span>
        ) : (
          <span style={{ fontSize: "10px", color: "#c4b5fd" }}>
            👆 <strong>탭 모드</strong> — 건반을 누르면 바로 소리가 납니다
          </span>
        )}
      </div>

      {/* ═══ PIANO KEYBOARD ═══ */}
      <div className="flex-1 min-h-0 p-1.5">
        <PianoKeyboard
          naturalNotes={naturalNotes}
          sharpNotes={sharpNotes}
          pressedNotes={pressedNotes}
          onPress={handleNotePress}
          onRelease={handleNoteRelease}
        />
      </div>
    </div>
  );
}

// ─── Piano Keyboard ──────────────────────────────────────────────────
interface PianoKeyboardProps {
  naturalNotes: Note[];
  sharpNotes: Note[];
  pressedNotes: Set<string>;
  onPress: (note: Note) => void;
  onRelease: (note: Note) => void;
}

function PianoKeyboard({ naturalNotes, sharpNotes, pressedNotes, onPress, onRelease }: PianoKeyboardProps) {
  return (
    <div className="relative w-full h-full" style={{ touchAction: "none" }}>
      {/* 흰 건반 */}
      <div className="absolute inset-0 flex gap-px">
        {naturalNotes.map((note) => (
          <WhiteKey
            key={note.id}
            note={note}
            isPressed={pressedNotes.has(note.id)}
            onPress={onPress}
            onRelease={onRelease}
          />
        ))}
      </div>

      {/* 검은 건반 오버레이 */}
      <BlackKeyLayer
        naturalNotes={naturalNotes}
        sharpNotes={sharpNotes}
        pressedNotes={pressedNotes}
        onPress={onPress}
        onRelease={onRelease}
      />
    </div>
  );
}

// ─── White Key ───────────────────────────────────────────────────────
function WhiteKey({
  note,
  isPressed,
  onPress,
  onRelease,
}: {
  note: Note;
  isPressed: boolean;
  onPress: (n: Note) => void;
  onRelease: (n: Note) => void;
}) {
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onPress(note);
  };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={(e) => { e.preventDefault(); onRelease(note); }}
      onPointerLeave={(e) => { e.preventDefault(); onRelease(note); }}
      onContextMenu={(e) => e.preventDefault()}
      className="flex-1 relative flex flex-col justify-end items-center rounded-b-2xl transition-transform duration-75 touch-none overflow-hidden"
      style={{
        background: isPressed
          ? `linear-gradient(180deg, ${note.color}40 0%, ${note.color}20 30%, #f8f8ff 100%)`
          : "linear-gradient(180deg, #dde0f0 0%, #ffffff 50%, #eaeaf8 100%)",
        border: isPressed
          ? `2px solid ${note.color}88`
          : "2px solid #c0c0d8",
        borderTop: isPressed
          ? `4px solid ${note.color}cc`
          : "4px solid #b8b8d0",
        boxShadow: isPressed
          ? `0 0 20px ${note.color}66, inset 0 4px 8px rgba(0,0,0,0.1)`
          : "0 6px 16px rgba(0,0,0,0.5), inset 0 -3px 6px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.8)",
        transform: isPressed ? "translateY(3px) scaleY(0.98)" : "translateY(0)",
        zIndex: 1,
        paddingBottom: "6px",
      }}
      aria-label={note.koreanFull}
      aria-pressed={isPressed}
    >
      {/* 누름 색상 효과 */}
      {isPressed && (
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: "40%",
            background: `linear-gradient(180deg, ${note.color}33, transparent)`,
          }}
        />
      )}

      {/* 광택 효과 */}
      {!isPressed && (
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: "30%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.6), transparent)",
            borderRadius: "0 0 4px 4px",
          }}
        />
      )}

      {/* 건반 하단 라벨 */}
      <div className="relative z-10 text-center pointer-events-none">
        <div
          className="font-black leading-none"
          style={{
            fontSize: "clamp(11px, 2.8vw, 22px)",
            color: isPressed ? note.color : "#2a2a4a",
            textShadow: isPressed ? `0 0 12px ${note.color}` : "none",
            transition: "color 0.05s",
          }}
        >
          {note.korean}
        </div>
        <div
          className="font-semibold mt-0.5 leading-none"
          style={{
            fontSize: "clamp(8px, 1.6vw, 13px)",
            color: isPressed ? `${note.color}cc` : "#6060a0",
            transition: "color 0.05s",
          }}
        >
          {note.name}
        </div>
      </div>

      {/* 눌림 표시점 */}
      {isPressed && (
        <div
          className="absolute bottom-1.5 rounded-full"
          style={{
            width: "clamp(6px, 1.2vw, 10px)",
            height: "clamp(6px, 1.2vw, 10px)",
            background: note.color,
            boxShadow: `0 0 8px ${note.color}`,
          }}
        />
      )}
    </button>
  );
}

// ─── Black Key Layer ─────────────────────────────────────────────────
function BlackKeyLayer({
  naturalNotes,
  sharpNotes,
  pressedNotes,
  onPress,
  onRelease,
}: {
  naturalNotes: Note[];
  sharpNotes: Note[];
  pressedNotes: Set<string>;
  onPress: (n: Note) => void;
  onRelease: (n: Note) => void;
}) {
  // 검은 건반의 흰 건반 기준 위치 매핑
  // 흰 건반: C(0) D(1) E(2) F(3) G(4) A(5) B(6)
  const sharpPositionMap: Record<string, number> = {
    "C#": 0,  // C 다음 (0번 흰건반 오른쪽)
    "D#": 1,  // D 다음 (1번 흰건반 오른쪽)
    "F#": 3,  // F 다음 (3번 흰건반 오른쪽)
    "G#": 4,  // G 다음 (4번 흰건반 오른쪽)
    "A#": 5,  // A 다음 (5번 흰건반 오른쪽)
  };

  const whiteCount = naturalNotes.length;
  const whiteWidthPct = 100 / whiteCount;
  // 검은 건반 너비: 흰 건반의 58%
  const blackWidthPct = whiteWidthPct * 0.58;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {sharpNotes.map((note) => {
        const rootName = note.name.replace(/\d+$/, ""); // e.g. "C#"
        const whiteIdx = sharpPositionMap[rootName];
        if (whiteIdx === undefined) return null;

        // 중앙: (whiteIdx + 1) * whiteWidthPct
        const leftPct = (whiteIdx + 1) * whiteWidthPct - blackWidthPct / 2;
        const isPressed = pressedNotes.has(note.id);

        return (
          <BlackKey
            key={note.id}
            note={note}
            isPressed={isPressed}
            leftPct={leftPct}
            widthPct={blackWidthPct}
            onPress={onPress}
            onRelease={onRelease}
          />
        );
      })}
    </div>
  );
}

// ─── Black Key ───────────────────────────────────────────────────────
function BlackKey({
  note,
  isPressed,
  leftPct,
  widthPct,
  onPress,
  onRelease,
}: {
  note: Note;
  isPressed: boolean;
  leftPct: number;
  widthPct: number;
  onPress: (n: Note) => void;
  onRelease: (n: Note) => void;
}) {
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onPress(note);
  };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); onRelease(note); }}
      onPointerLeave={(e) => { e.preventDefault(); e.stopPropagation(); onRelease(note); }}
      onContextMenu={(e) => e.preventDefault()}
      className="absolute top-0 flex flex-col justify-end items-center rounded-b-xl transition-transform duration-75 touch-none pointer-events-auto overflow-hidden"
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        height: "62%",
        background: isPressed
          ? `linear-gradient(180deg, ${note.color}dd 0%, ${note.color}88 100%)`
          : "linear-gradient(180deg, #252538 0%, #12121f 55%, #1e1e32 100%)",
        border: isPressed
          ? `2px solid ${note.color}`
          : "2px solid #3a3a58",
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
        boxShadow: isPressed
          ? `0 0 20px ${note.color}88, inset 0 2px 4px rgba(0,0,0,0.2)`
          : "0 8px 16px rgba(0,0,0,0.7), inset 0 -2px 3px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.05)",
        transform: isPressed ? "translateY(3px) scaleY(0.97)" : "translateY(0)",
        zIndex: 3,
        paddingBottom: "5px",
      }}
      aria-label={note.koreanFull}
      aria-pressed={isPressed}
    >
      {/* 광택 효과 */}
      {!isPressed && (
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: "35%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.08), transparent)",
          }}
        />
      )}

      {/* 눌림 효과 */}
      {isPressed && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 20%, ${note.color}44, transparent 70%)`,
          }}
        />
      )}

      {/* 라벨 */}
      <div className="relative z-10 text-center pointer-events-none">
        <div
          className="font-black leading-none"
          style={{
            fontSize: "clamp(7px, 1.7vw, 14px)",
            color: isPressed ? "white" : "#8888bb",
            textShadow: isPressed ? `0 0 10px ${note.color}` : "none",
          }}
        >
          {note.korean}
        </div>
        <div
          style={{
            fontSize: "clamp(5px, 1.2vw, 10px)",
            color: isPressed ? "rgba(255,255,255,0.7)" : "#555577",
            lineHeight: 1.2,
            marginTop: "1px",
          }}
        >
          {note.name}
        </div>
      </div>
    </button>
  );
}
