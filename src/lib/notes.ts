export interface Note {
  id: string;
  name: string;       // 영어 표기 (C4, D#4 등)
  korean: string;     // 한국어 계이름
  koreanFull: string; // 전체 표기
  frequency: number;  // Hz
  octave: number;
  isSharp: boolean;
  isFlat: boolean;
  color: string;      // 버튼 색상
  row: number;        // 0: 자연음, 1: 샾/플랫
}

// 주파수 계산 함수 (A4 = 440Hz 기준)
function noteFrequency(semitones: number, octave: number): number {
  // C4 = 261.63Hz, A4 = 440Hz
  // semitone from C4: C=0, C#=1, D=2, D#=3, E=4, F=5, F#=6, G=7, G#=8, A=9, A#=10, B=11
  const c4 = 261.63;
  const diff = semitones + (octave - 4) * 12;
  return c4 * Math.pow(2, diff / 12);
}

// 3~5 옥타브 전체 음표
export function generateNotes(octave: number = 4): Note[] {
  const naturalNotes: Note[] = [
    {
      id: `C${octave}`,
      name: `C${octave}`,
      korean: "도",
      koreanFull: `도(C${octave})`,
      frequency: noteFrequency(0, octave),
      octave,
      isSharp: false,
      isFlat: false,
      color: "#e74c3c",
      row: 0,
    },
    {
      id: `D${octave}`,
      name: `D${octave}`,
      korean: "레",
      koreanFull: `레(D${octave})`,
      frequency: noteFrequency(2, octave),
      octave,
      isSharp: false,
      isFlat: false,
      color: "#e67e22",
      row: 0,
    },
    {
      id: `E${octave}`,
      name: `E${octave}`,
      korean: "미",
      koreanFull: `미(E${octave})`,
      frequency: noteFrequency(4, octave),
      octave,
      isSharp: false,
      isFlat: false,
      color: "#f1c40f",
      row: 0,
    },
    {
      id: `F${octave}`,
      name: `F${octave}`,
      korean: "파",
      koreanFull: `파(F${octave})`,
      frequency: noteFrequency(5, octave),
      octave,
      isSharp: false,
      isFlat: false,
      color: "#2ecc71",
      row: 0,
    },
    {
      id: `G${octave}`,
      name: `G${octave}`,
      korean: "솔",
      koreanFull: `솔(G${octave})`,
      frequency: noteFrequency(7, octave),
      octave,
      isSharp: false,
      isFlat: false,
      color: "#1abc9c",
      row: 0,
    },
    {
      id: `A${octave}`,
      name: `A${octave}`,
      korean: "라",
      koreanFull: `라(A${octave})`,
      frequency: noteFrequency(9, octave),
      octave,
      isSharp: false,
      isFlat: false,
      color: "#3498db",
      row: 0,
    },
    {
      id: `B${octave}`,
      name: `B${octave}`,
      korean: "시",
      koreanFull: `시(B${octave})`,
      frequency: noteFrequency(11, octave),
      octave,
      isSharp: false,
      isFlat: false,
      color: "#9b59b6",
      row: 0,
    },
  ];

  const sharpNotes: Note[] = [
    {
      id: `C#${octave}`,
      name: `C#${octave}`,
      korean: "도♯",
      koreanFull: `도♯(C#${octave})`,
      frequency: noteFrequency(1, octave),
      octave,
      isSharp: true,
      isFlat: false,
      color: "#c0392b",
      row: 1,
    },
    {
      id: `D#${octave}`,
      name: `D#${octave}`,
      korean: "레♯",
      koreanFull: `레♯(D#${octave})`,
      frequency: noteFrequency(3, octave),
      octave,
      isSharp: true,
      isFlat: false,
      color: "#d35400",
      row: 1,
    },
    {
      id: `F#${octave}`,
      name: `F#${octave}`,
      korean: "파♯",
      koreanFull: `파♯(F#${octave})`,
      frequency: noteFrequency(6, octave),
      octave,
      isSharp: true,
      isFlat: false,
      color: "#27ae60",
      row: 1,
    },
    {
      id: `G#${octave}`,
      name: `G#${octave}`,
      korean: "솔♯",
      koreanFull: `솔♯(G#${octave})`,
      frequency: noteFrequency(8, octave),
      octave,
      isSharp: true,
      isFlat: false,
      color: "#16a085",
      row: 1,
    },
    {
      id: `A#${octave}`,
      name: `A#${octave}`,
      korean: "라♯",
      koreanFull: `라♯(A#${octave})`,
      frequency: noteFrequency(10, octave),
      octave,
      isSharp: true,
      isFlat: false,
      color: "#2980b9",
      row: 1,
    },
  ];

  return [...naturalNotes, ...sharpNotes];
}

export const INSTRUMENTS = [
  { id: "flute", name: "플루트 🎵", emoji: "🎵" },
  { id: "recorder", name: "리코더 🪈", emoji: "🪈" },
  { id: "ocarina", name: "오카리나 🫙", emoji: "🫙" },
  { id: "saxophone", name: "색소폰 🎷", emoji: "🎷" },
  { id: "trumpet", name: "트럼펫 🎺", emoji: "🎺" },
  { id: "violin", name: "바이올린 🎻", emoji: "🎻" },
  { id: "clarinet", name: "클라리넷 🎶", emoji: "🎶" },
  { id: "harmonica", name: "하모니카 🎸", emoji: "🎸" },
] as const;

export const OCTAVES = [3, 4, 5] as const;
