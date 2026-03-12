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

export interface ScreenContent {
  type: 'text' | 'image';
  content: string;
}

export interface DiceScreens {
  top: ScreenContent;
  bottom: ScreenContent;
  front: ScreenContent;
  back: ScreenContent;
  left: ScreenContent;
  right: ScreenContent;
}

export type TabType = 'project' | 'editor' | 'sim2d' | 'sim3d' | 'games' | 'logs' | 'assets' | 'settings';
