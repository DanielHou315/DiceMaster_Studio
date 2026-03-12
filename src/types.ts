export interface ProjectFile {
  path: string;
  content: string;
}

export interface AnalysisLog {
  id: number;
  content: string;
  created_at: string;
}

export interface LanguageGame {
  id: number;
  name: string;
  description: string;
  code: string;
  mock_data: string;
  mock_rounds?: string[]; // Array of JSON strings for rounds
  assets_manifest?: string;
  created_at: string;
}

/** Mirrors hardware TextEntry for positioned text rendering */
export interface HWTextEntry {
  x: number;          // x_cursor (0-479)
  y: number;          // y_cursor (0-479)
  fontId: number;     // 0=notext, 1=tf, 2=arabic, 3=chinese, 4=cyrillic, 5=devanagari
  fontColor: string;  // CSS color string
  text: string;
}

export interface ScreenContent {
  type: 'text' | 'image';
  content: string;
  /** Structured text entries matching hardware TextGroup format */
  textEntries?: HWTextEntry[];
  /** Background CSS color (converted from RGB565) */
  bgColor?: string;
}

export interface DiceScreens {
  top: ScreenContent;
  bottom: ScreenContent;
  front: ScreenContent;
  back: ScreenContent;
  left: ScreenContent;
  right: ScreenContent;
}

export type TabType = 'project' | 'editor' | 'sim2d' | 'sim3d' | 'simulator' | 'games' | 'logs' | 'assets' | 'settings';
