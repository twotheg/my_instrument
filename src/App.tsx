import { useState, useCallback, useRef, useEffect } from "react";
import { generateKeyboardNotes, INSTRUMENTS, OCTAVES, type Note } from "./lib/notes";
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

  const pressedNotesRef = useRef<Set<string>>(new Set());
  const currentNoteRef = useRef<Note | null>(null);
  const micModeRef = useRef(false);

  const { startNote, stopNote, stopAllNotes } = useAudioEngine();
  const { installable, install } = usePWAInstall();

  // 폰 화면 한 줄에 담을 두 옥타브 분량(자연음 14개 + 샾/플랫 10개)
  const notes = generateKeyboardNotes(selectedOctave);
  const naturalNotes = notes.filter((n) => !n.isSharp && !n.isFlat);
  const sharpNotes = notes.filter((n) => n.isSharp || n.isFlat);

  const handleBreath = useCallback(
    (volume: number) => {
      if (!micModeRef.current) return;
      pressedNotesRef.current.forEach((noteId) => {
        const note = generateKeyboardNotes(selectedOctave).find((n) => n.id === noteId);
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

          {/* 현재 선택된 악기 */}
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <span style={{ fontSize: "13px" }}>{selectedInstrumentInfo?.emoji}</span>
            <span className="text-gray-300" style={{ fontSize: "10px" }}>{selectedInstrumentInfo?.name}</span>
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

      {/* ═══ 악기 선택 STRIP ═══ */}
      <div
        className="flex-shrink-0 flex items-center gap-1.5 px-2 overflow-x-auto"
        style={{
          height: "44px",
          background: "rgba(0,0,0,0.25)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {INSTRUMENTS.map((inst) => {
          const isSelected = selectedInstrument === inst.id;
          return (
            <button
              key={inst.id}
              onClick={() => setSelectedInstrument(inst.id as InstrumentType)}
              className="flex-shrink-0 flex items-center gap-1 rounded-lg font-semibold transition-all"
              style={{
                padding: "5px 10px",
                fontSize: "11px",
                background: isSelected
                  ? "linear-gradient(135deg, #7c3aed, #2563eb)"
                  : "rgba(255,255,255,0.07)",
                color: isSelected ? "white" : "#9ca3af",
                border: isSelected
                  ? "1px solid rgba(124,58,237,0.7)"
                  : "1px solid rgba(255,255,255,0.08)",
                boxShadow: isSelected ? "0 0 10px rgba(124,58,237,0.45)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: "14px" }}>{inst.emoji}</span>
              <span>{inst.name}</span>
            </button>
          );
        })}
      </div>

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

      {/* ═══ NOTE KEYBOARD (네모 박스형) ═══ */}
      <div className="flex-1 min-h-0 p-1.5">
        <BoxKeyboard
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

// ─── Box Keyboard (네모 박스형, 폰 최적화) ──────────────────────────────
// 옥타브 안에서 샾/플랫이 어느 자연음 바로 오른쪽 경계에 오는지 (피아노 순서 그대로)
// 도-레 사이, 레-미 사이, (미-파 없음), 파-솔 사이, 솔-라 사이, 라-시 사이, (시-도 없음)
const SHARP_SLOT_MAP: Record<string, number> = {
  "C#": 0,
  "D#": 1,
  "F#": 3,
  "G#": 4,
  "A#": 5,
};

interface BoxKeyboardProps {
  naturalNotes: Note[];
  sharpNotes: Note[];
  pressedNotes: Set<string>;
  onPress: (note: Note) => void;
  onRelease: (note: Note) => void;
}

function BoxKeyboard({ naturalNotes, sharpNotes, pressedNotes, onPress, onRelease }: BoxKeyboardProps) {
  const naturalCount = naturalNotes.length;
  const naturalWidthPct = 100 / naturalCount;
  const accidentalWidthPct = naturalWidthPct * 0.72;

  return (
    <div className="relative w-full h-full flex flex-col gap-1" style={{ touchAction: "none" }}>
      {/* 위쪽 줄: 샾/플랫 박스 — 자연음 사이사이에, 피아노 건반 순서 그대로 배치 */}
      <div className="relative flex-shrink-0" style={{ height: "36%" }}>
        {sharpNotes.map((note) => {
          const rootName = note.name.replace(/\d+$/, "");
          const localSlot = SHARP_SLOT_MAP[rootName];
          if (localSlot === undefined) return null;

          // 이 음이 속한 옥타브가 14칸 중 몇 번째부터 시작하는지 (0 또는 7)
          const blockStart = naturalNotes.findIndex((n) => n.octave === note.octave);
          if (blockStart === -1) return null;

          const globalWhiteIdx = blockStart + localSlot;
          const centerPct = (globalWhiteIdx + 1) * naturalWidthPct;
          const leftPct = centerPct - accidentalWidthPct / 2;

          return (
            <AccidentalKey
              key={note.id}
              note={note}
              isPressed={pressedNotes.has(note.id)}
              leftPct={leftPct}
              widthPct={accidentalWidthPct}
              onPress={onPress}
              onRelease={onRelease}
            />
          );
        })}
      </div>

      {/* 아래쪽 줄: 자연음 박스 — 도부터 한 줄로 */}
      <div className="flex-1 flex gap-1">
        {naturalNotes.map((note) => (
          <NaturalKey
            key={note.id}
            note={note}
            isPressed={pressedNotes.has(note.id)}
            onPress={onPress}
            onRelease={onRelease}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Natural Key (네모 박스, 자연음) ────────────────────────────────────
function NaturalKey({
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
      className="flex-1 relative flex flex-col justify-center items-center rounded-xl transition-transform duration-75 touch-none overflow-hidden"
      style={{
        background: isPressed
          ? `linear-gradient(160deg, ${note.color}ee 0%, ${note.color}bb 100%)`
          : `linear-gradient(160deg, ${note.color}38 0%, ${note.color}18 100%)`,
        border: isPressed ? `2px solid ${note.color}` : `2px solid ${note.color}55`,
        boxShadow: isPressed
          ? `0 0 18px ${note.color}88, inset 0 2px 4px rgba(255,255,255,0.25)`
          : `inset 0 1px 2px rgba(255,255,255,0.12), 0 2px 6px rgba(0,0,0,0.35)`,
        transform: isPressed ? "scale(0.94)" : "scale(1)",
        zIndex: 1,
      }}
      aria-label={note.koreanFull}
      aria-pressed={isPressed}
    >
      {/* 라벨 */}
      <div className="relative z-10 text-center pointer-events-none">
        <div
          className="font-black leading-none"
          style={{
            fontSize: "clamp(12px, 2.6vw, 21px)",
            color: isPressed ? "#ffffff" : note.color,
            textShadow: isPressed ? "0 0 10px rgba(0,0,0,0.35)" : "none",
            transition: "color 0.05s",
          }}
        >
          {note.korean}
        </div>
        <div
          className="font-semibold mt-0.5 leading-none"
          style={{
            fontSize: "clamp(7px, 1.4vw, 11px)",
            color: isPressed ? "rgba(255,255,255,0.85)" : `${note.color}bb`,
            transition: "color 0.05s",
          }}
        >
          {note.name}
        </div>
      </div>
    </button>
  );
}

// ─── Accidental Key (네모 박스, 샾/플랫) ────────────────────────────────
function AccidentalKey({
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
      className="absolute top-0 flex flex-col justify-center items-center rounded-lg transition-transform duration-75 touch-none overflow-hidden"
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        height: "100%",
        background: isPressed
          ? `linear-gradient(160deg, ${note.color}ee 0%, ${note.color}bb 100%)`
          : `linear-gradient(160deg, ${note.color}55 0%, ${note.color}2a 100%)`,
        border: isPressed ? `2px solid ${note.color}` : `2px solid ${note.color}77`,
        boxShadow: isPressed
          ? `0 0 14px ${note.color}88, inset 0 2px 3px rgba(255,255,255,0.2)`
          : "inset 0 1px 2px rgba(255,255,255,0.1), 0 2px 5px rgba(0,0,0,0.4)",
        transform: isPressed ? "scale(0.92)" : "scale(1)",
        zIndex: 2,
      }}
      aria-label={note.koreanFull}
      aria-pressed={isPressed}
    >
      <div className="relative z-10 text-center pointer-events-none">
        <div
          className="font-black leading-none"
          style={{
            fontSize: "clamp(9px, 1.9vw, 15px)",
            color: isPressed ? "#ffffff" : note.color,
            textShadow: isPressed ? "0 0 8px rgba(0,0,0,0.35)" : "none",
          }}
        >
          {note.korean}
        </div>
        <div
          style={{
            fontSize: "clamp(6px, 1.1vw, 9px)",
            color: isPressed ? "rgba(255,255,255,0.8)" : `${note.color}bb`,
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
