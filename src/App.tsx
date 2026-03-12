import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileCode, Dice6, Sparkles, ChevronRight, Loader2, CheckCircle2, AlertCircle, History, Save, Play, Monitor, Code2, RotateCw, Smartphone, Languages, Plus, Trash2, Download, Package, Box, Zap, Image as ImageIcon, Wand2, ShieldAlert, ShieldCheck, ShieldQuestion, Layout, Github, FileUp, Settings as SettingsIcon, Usb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import Editor from "@monaco-editor/react";
import ReactDiffViewer from 'react-diff-viewer-continued';
import JSZip from 'jszip';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { Dice3D } from './components/Dice3D';
import { CSSDice3D } from './components/CSSDice3D';
import { CanvasDice3D } from './components/CanvasDice3D';
import { SimulatorScreen } from './components/Simulator/SimulatorScreen';
import { GameCard } from './components/Games/GameCard';
import { AssetCard } from './components/Assets/AssetCard';
import { serialService } from './services/serialService';
import { ProjectFile, AnalysisLog, LanguageGame, DiceScreens, TabType } from './types';
import { CHINESE_QUIZLET_CODE, DEFAULT_BASE_CODE, HARDWARE_OPTIMIZER_CODE } from './constants';
import { Simulator2D } from './components/Simulator/Simulator2D';
import { Simulator3DContainer } from './components/Simulator/Simulator3DContainer';
import { CodeEditor } from './components/Editor/CodeEditor';
import { GamesView } from './components/Games/GamesView';
import { GameContentEditor } from './components/Games/GameContentEditor';
import { AssetsView } from './components/Assets/AssetsView';
import { SettingsView } from './components/Settings/SettingsView';
import { cn } from './lib/utils';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('sim2d');
  const [simView, setSimView] = useState<'2d' | '3d' | 'split'>('split');
  const [isShaking, setIsShaking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [files, setFiles] = useState<ProjectFile[]>([
    { path: 'main.py', content: DEFAULT_BASE_CODE }
  ]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [logs, setLogs] = useState<AnalysisLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>({ path: 'main.py', content: DEFAULT_BASE_CODE });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [languageGames, setLanguageGames] = useState<LanguageGame[]>([]);
  const [isGeneratingGame, setIsGeneratingGame] = useState(false);
  const [gamePrompt, setGamePrompt] = useState('');
  const [previewFiles, setPreviewFiles] = useState<ProjectFile[] | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [breakingAnalysis, setBreakingAnalysis] = useState<string | null>(null);
  const [breakingRisk, setBreakingRisk] = useState<'low' | 'medium' | 'high' | null>(null);
  const [isAnalyzingBreaking, setIsAnalyzingBreaking] = useState(false);
  const [pendingZip, setPendingZip] = useState<File | null>(null);
  const [isUsbConnected, setIsUsbConnected] = useState(false);

  const connectUsb = async () => {
    const success = await serialService.requestPort();
    if (success) {
      setIsUsbConnected(true);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      setError("Failed to connect to USB device. Make sure your browser supports Web Serial.");
    }
  };

  const disconnectUsb = async () => {
    await serialService.disconnect();
    setIsUsbConnected(false);
  };
  const [isFlashing, setIsFlashing] = useState(false);
  const [isExpandingData, setIsExpandingData] = useState(false);
  const [activeGame, setActiveGame] = useState<LanguageGame | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [isEnhancingGame, setIsEnhancingGame] = useState<number | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [isImprovingGame, setIsImprovingGame] = useState<number | null>(null);
  const [editingGame, setEditingGame] = useState<LanguageGame | null>(null);
  const [improvementPrompt, setImprovementPrompt] = useState('');
  const [assetPrompt, setAssetPrompt] = useState('');
  const [hasWebGL, setHasWebGL] = useState(true);
  const [engineType, setEngineType] = useState<'webgl' | 'css' | 'canvas'>('css');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings State
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [autoSave, setAutoSave] = useState(true);
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [shakeSensitivity, setShakeSensitivity] = useState(50);

  // Auto-save logic
  useEffect(() => {
    if (autoSave && selectedFile && saveStatus === 'idle') {
      const timer = setTimeout(() => {
        saveFile();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [selectedFile?.content, autoSave]);

  // Apply Theme
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.classList.add('light');
    } else {
      html.classList.remove('light');
    }
  }, [theme]);

  const resetAllData = async () => {
    if (window.confirm("Are you sure you want to reset all data? This will delete all games, assets, and project files.")) {
      try {
        await fetch('/api/language-games', { method: 'DELETE' });
        await fetch('/api/assets', { method: 'DELETE' });
        await fetch('/api/project', { method: 'DELETE' });
        await fetch('/api/logs', { method: 'DELETE' });
        setLanguageGames([]);
        setAssets([]);
        setFiles([{ path: 'main.py', content: DEFAULT_BASE_CODE }]);
        setSelectedFile({ path: 'main.py', content: DEFAULT_BASE_CODE });
        setLogs([]);
        setAnalysis(null);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error(err);
        setError("Failed to reset data.");
      }
    }
  };

  const resolveScreens = useCallback((data: any) => {
    const resolved: any = JSON.parse(JSON.stringify(data));
    (Object.keys(resolved) as Array<keyof DiceScreens>).forEach(face => {
      if (resolved[face].type === 'image') {
        const asset = assets.find(a => a.name === resolved[face].content);
        if (asset) {
          resolved[face].content = asset.data;
        }
      }
    });
    return resolved;
  }, [assets]);

  const loadGitHubCode = async () => {
    try {
      setIsAnalyzing(true);
      const response = await fetch('https://raw.githubusercontent.com/DanielHou315/DiceMaster/main/scripts/hardware_optimizer.py');
      
      let content = HARDWARE_OPTIMIZER_CODE;
      if (response.ok) {
        content = await response.text();
      }
      
      const newFile = { path: 'optimizer.py', content };
      setFiles(prev => {
        if (prev.some(f => f.path === 'optimizer.py')) return prev;
        return [...prev, newFile];
      });
      setSelectedFile(newFile);
      setActiveTab('editor');
      setError(null);
    } catch (err) {
      console.warn('Failed to fetch from GitHub, using local optimizer port');
      const newFile = { path: 'optimizer.py', content: HARDWARE_OPTIMIZER_CODE };
      setFiles(prev => {
        if (prev.some(f => f.path === 'optimizer.py')) return prev;
        return [...prev, newFile];
      });
      setSelectedFile(newFile);
      // Stay on current tab instead of switching to editor
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchAndSetGames = async () => {
    try {
      const res = await fetch('/api/language-games');
      if (res.ok) {
        const data = await res.json();
        const games = data.games.map((g: any) => {
          let mockRounds = [];
          try {
            if (g.mock_rounds) {
              mockRounds = typeof g.mock_rounds === 'string' ? JSON.parse(g.mock_rounds) : g.mock_rounds;
            }
          } catch (e) {
            console.error("Failed to parse mock_rounds for game", g.name, e);
          }
          return {
            ...g,
            mock_rounds: mockRounds
          };
        });
        setLanguageGames(games);
        return games;
      }
    } catch (err) {
      console.error("Failed to fetch games", err);
    }
    return [];
  };

  const injectFeaturedGame = async (currentGames: LanguageGame[] = []) => {
    // Check if it already exists to prevent duplicates
    if (currentGames.some(g => g.name === "Chinese Quizlet (Official)") || 
        languageGames.some(g => g.name === "Chinese Quizlet (Official)")) {
      return;
    }

    const featuredGame: LanguageGame = {
      id: Date.now(),
      name: "Chinese Quizlet (Official)",
      description: "Advanced multi-screen game from the DiceMaster repository. Shake to cycle through vocabulary cards with image hints.",
      code: CHINESE_QUIZLET_CODE,
      mock_data: JSON.stringify({
        top: { type: "text", content: "Chinese Quizlet" },
        bottom: { type: "text", content: "Shake to Start" },
        front: { type: "text", content: "DiceMaster" },
        back: { type: "text", content: "Ready" },
        left: { type: "text", content: "v2.4" },
        right: { type: "text", content: "Lab" }
      }),
      mock_rounds: [
        JSON.stringify({
          top: { type: "text", content: "How do you say 'Apple'?" },
          bottom: { type: "text", content: "苹果 (Píngguǒ)" },
          front: { type: "text", content: "Red Fruit" },
          back: { type: "text", content: "Sweet" },
          left: { type: "text", content: "Crunchy" },
          right: { type: "text", content: "🍎" }
        }),
        JSON.stringify({
          top: { type: "text", content: "How do you say 'Computer'?" },
          bottom: { type: "text", content: "电脑 (Diànnǎo)" },
          front: { type: "text", content: "Electric Brain" },
          back: { type: "text", content: "Screen" },
          left: { type: "text", content: "Keyboard" },
          right: { type: "text", content: "💻" }
        }),
        JSON.stringify({
          top: { type: "text", content: "How do you say 'Cat'?" },
          bottom: { type: "text", content: "猫 (Māo)" },
          front: { type: "text", content: "Meow" },
          back: { type: "text", content: "Feline" },
          left: { type: "text", content: "Whiskers" },
          right: { type: "text", content: "🐱" }
        })
      ],
      created_at: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/language-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(featuredGame)
      });
      if (res.ok) {
        await fetchAndSetGames();
      }
    } catch (err) {
      console.error("Failed to inject featured game", err);
    }
  };

  const generateGameInstructions = async (game: LanguageGame) => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        Create a detailed Markdown README for the following language game:
        Name: ${game.name}
        Description: ${game.description}
        Code: ${game.code.slice(0, 1000)}...

        The README should include:
        - A "How to Play" section.
        - A "How to Add More Content" section (explaining how to modify the GAME_ROUNDS list).
        - A brief overview of the game's educational value.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const readmeContent = response.text || "";
      const readmePath = `games/${game.name.replace(/\s+/g, '_')}_README.md`;
      
      const newFile = { path: readmePath, content: readmeContent };
      setFiles(prev => {
        if (prev.some(f => f.path === readmePath)) {
          return prev.map(f => f.path === readmePath ? newFile : f);
        }
        return [...prev, newFile];
      });
      setSelectedFile(newFile);
      // Stay on current tab instead of switching to editor
    } catch (err) {
      console.error("Failed to generate instructions", err);
      setError("Failed to generate instructions.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const editInstructions = (path: string) => {
    const file = files.find(f => f.path === path);
    if (file) {
      setSelectedFile(file);
      setActiveTab('editor');
    }
  };

  const expandGameData = async (game: LanguageGame) => {
    setIsExpandingData(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const currentRounds = game.mock_rounds || [];
      
      const prompt = `
        I have a language learning game for a 6-sided LCD dice.
        Game Name: ${game.name}
        Description: ${game.description}
        
        Current Rounds Data:
        ${JSON.stringify(currentRounds.slice(0, 5).map(r => JSON.parse(r)))}
        
        Please generate 10 NEW and interesting rounds for this game.
        Each round must be a JSON object with keys: "top", "bottom", "front", "back", "left", "right".
        Each key must have a "type" ("text" or "image") and "content" (string).
        
        Return ONLY a JSON array of these 10 rounds.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const newRoundsRaw = JSON.parse(response.text || "[]");
      const newRoundsStringified = newRoundsRaw.map((r: any) => JSON.stringify(r));
      const updatedRounds = [...currentRounds, ...newRoundsStringified];
      
      const updatedGame: LanguageGame = {
        ...game,
        mock_rounds: updatedRounds
      };
      
      // Update on server
      await updateGameContent(updatedGame);
      setActiveGame(updatedGame);
    } catch (err) {
      console.error("Failed to expand game data", err);
      setError("Failed to expand game data.");
    } finally {
      setIsExpandingData(false);
    }
  };

  const runCurrentCode = async () => {
    if (!selectedFile) return;
    
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    setActiveGame(null); // Clear active game simulation

    // Try to extract mock data from comments
    const mockMatch = selectedFile.content.match(/#\s*MOCK_SCREENS\s*=\s*({.*})/);
    if (mockMatch) {
      try {
        const mockData = JSON.parse(mockMatch[1]);
        setScreens(resolveScreens(mockData));
      } catch (err) {
        console.error("Failed to parse mock data from file", err);
      }
    }

    // Ensure we are on a simulator tab
    if (activeTab !== 'sim2d' && activeTab !== 'sim3d') {
      setActiveTab('sim2d');
    }
  };

  // Simulator State
  const [screens, setScreens] = useState<DiceScreens>({
    top: { type: 'text', content: 'DiceMaster Quiz' },
    bottom: { type: 'text', content: 'Shake to Start' },
    front: { type: 'text', content: '?' },
    back: { type: 'text', content: '?' },
    left: { type: 'text', content: '?' },
    right: { type: 'text', content: '?' },
  });

  // Load initial data
  useEffect(() => {
    // Check WebGL availability
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const available = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        setHasWebGL(available);
      } catch (e) {
        setHasWebGL(false);
      }
    };
    checkWebGL();

    const loadData = async () => {
      try {
        const [projectRes, logsRes, gamesRes, assetsRes] = await Promise.all([
          fetch('/api/project'),
          fetch('/api/logs'),
          fetch('/api/language-games'),
          fetch('/api/assets')
        ]);
        
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          if (projectData.files && projectData.files.length > 0) {
            setFiles(projectData.files);
            setSelectedFile(projectData.files[0]);
          } else {
            // Preload DiceMaster base code if no project exists
            loadGitHubCode();
          }
        } else {
          // Fallback to preloading if API fails
          loadGitHubCode();
        }
        
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData.logs);
        }

        if (gamesRes.ok) {
          const games = await fetchAndSetGames();
          if (games.length === 0) {
            injectFeaturedGame(games);
          }
        }

        if (assetsRes.ok) {
          const assetsData = await assetsRes.json();
          setAssets(assetsData.assets);
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    };
    loadData();
  }, []);

  const onFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setError("Please upload a .zip file (GitHub repository export).");
      return;
    }

    setIsUploading(true);
    setError(null);
    setAnalysis(null);
    setPreviewFiles(null);
    setBreakingAnalysis(null);
    setPendingZip(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-preview', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload and unzip file');

      const data = await response.json();
      const newFiles: ProjectFile[] = data.files;

      // Check if identical
      const isIdentical = newFiles.length === files.length && newFiles.every(nf => {
        const existing = files.find(f => f.path === nf.path);
        return existing && existing.content === nf.content;
      });

      if (isIdentical) {
        setError("The uploaded code is identical to the current project.");
        setPendingZip(null);
      } else {
        setPreviewFiles(newFiles);
        analyzeBreakingChanges(newFiles);
      }
    } catch (err) {
      setError("Error processing file. Make sure it's a valid ZIP.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  }, [files]);

  const analyzeBreakingChanges = async (newFiles: ProjectFile[]) => {
    if (languageGames.length === 0) return;
    setIsAnalyzingBreaking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const currentSummary = files.map(f => `File: ${f.path}\nContent:\n${f.content.slice(0, 500)}...`).join('\n\n');
      const newSummary = newFiles.map(f => `File: ${f.path}\nContent:\n${f.content.slice(0, 500)}...`).join('\n\n');
      const gamesSummary = languageGames.map(g => `Game: ${g.name}\nDescription: ${g.description}`).join('\n\n');

      const prompt = `
        I am updating the base code of my 6-sided LCD dice project.
        I have several "Language Games" already created that rely on the current architecture.
        
        Current Code Summary:
        ${currentSummary}
        
        New Code Summary:
        ${newSummary}
        
        Existing Language Games:
        ${gamesSummary}
        
        Please analyze if the new code changes will break any of the existing language games.
        Focus on changes to APIs, file structures, or core logic that the games might depend on.
        Provide a concise summary of potential breaking changes.
        
        Also, categorize the risk level as "low", "medium", or "high".
        Output format:
        RISK: [level]
        ANALYSIS: [your markdown analysis]
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || "";
      const riskMatch = text.match(/RISK:\s*(low|medium|high)/i);
      const analysisMatch = text.match(/ANALYSIS:\s*([\s\S]*)/i);

      setBreakingRisk((riskMatch?.[1]?.toLowerCase() as any) || 'medium');
      setBreakingAnalysis(analysisMatch?.[1] || text || "No breaking changes detected.");
    } catch (err) {
      console.error("Breaking analysis failed", err);
    } finally {
      setIsAnalyzingBreaking(false);
    }
  };

  const commitChanges = async () => {
    if (!pendingZip) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', pendingZip);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to commit changes');

      const data = await response.json();
      setFiles(data.files);
      if (data.files.length > 0) {
        setSelectedFile(data.files[0]);
      }
      setPreviewFiles(null);
      setPendingZip(null);
      setBreakingAnalysis(null);
      setAnalysis(null);
      setActiveTab('project');
    } catch (err) {
      setError("Failed to commit changes.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const createNewFile = () => {
    const name = prompt("Enter file name (e.g. utils.py):");
    if (!name) return;
    const newFile = { path: name, content: '' };
    setFiles(prev => [...prev, newFile]);
    setSelectedFile(newFile);
  };

  const deleteFile = (path: string) => {
    if (path === 'main.py' || path === 'github_base.py') return;
    if (!confirm(`Are you sure you want to delete ${path}?`)) return;
    setFiles(prev => prev.filter(f => f.path !== path));
    if (selectedFile?.path === path) {
      setSelectedFile(files.find(f => f.path === 'main.py') || null);
    }
  };

  const downloadProject = async () => {
    const zip = new JSZip();
    files.forEach(f => zip.file(f.path, f.content));
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dicemaster_project.zip';
    a.click();
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetch('/api/project/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile.path, content: selectedFile.content })
      });
      if (res.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const analyzeProject = async () => {
    if (files.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Prepare a summary of the project for the AI
      const fileSummary = files.map(f => `File: ${f.path}\nContent:\n${f.content.slice(0, 1000)}...`).join('\n\n');
      
      const prompt = `
        You are an expert embedded systems and game developer. 
        I have uploaded a project for a 6-sided LCD dice called "DiceMaster" (https://github.com/DanielHou315/DiceMaster). 
        Alfonso (the user) wants to analyze this code and create more mini-games for it.
        
        The DiceMaster architecture typically uses:
        - A Raspberry Pi running ROS2 as the "Central" controller.
        - ESP32-based screens.
        - A "Strategy" pattern for games (BaseStrategy).
        - Motion detection (shaking/rotation) via IMU messages.
        
        Here are the project files:
        ${fileSummary}
        
        Please:
        1. Analyze the current architecture and how games are implemented in this specific codebase.
        2. Suggest 3-5 creative mini-game ideas that would work well on a 6-sided LCD dice (small screen, limited input).
        3. Provide technical advice on how to improve the existing codebase for better modularity or performance, specifically keeping compatibility with the official DiceMaster repository.
        
        Format your response in clear Markdown.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const resultText = response.text || "No analysis generated.";
      setAnalysis(resultText);

      // Save to logs
      const logRes = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: resultText })
      });

      if (logRes.ok) {
        const logsRes = await fetch('/api/logs');
        const logsData = await logsRes.json();
        setLogs(logsData.logs);
      }

    } catch (err) {
      setError("AI Analysis failed. Please check your API key or project size.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createLanguageGame = async (mode: 'random' | 'text' | 'media' | 'custom') => {
    if (files.length === 0) {
      setError("Please upload your project first so I can understand the architecture.");
      return;
    }

    setIsGeneratingGame(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const fileSummary = files.map(f => `File: ${f.path}\nContent:\n${f.content.slice(0, 1000)}...`).join('\n\n');

      let userRequest = '';
      if (mode === 'random') userRequest = 'Create a random, creative language learning game.';
      else if (mode === 'text') userRequest = 'Create a text-only language learning game. No images or media.';
      else if (mode === 'media') userRequest = 'Create a language learning game that uses images or media assets. Provide a manifest of required assets.';
      else userRequest = gamePrompt || 'Create a creative language learning game.';

      const prompt = `
        You are an expert embedded systems developer. Create a new "Language Learning Mini-Game" for a 6-sided LCD dice.
        The game should be compatible with the "DiceMaster" project (https://github.com/DanielHou315/DiceMaster).
        
        The DiceMaster architecture typically uses:
        - A Raspberry Pi running ROS2 as the "Central" controller.
        - ESP32-based screens.
        - A "Strategy" pattern for games (BaseStrategy).
        - Motion detection (shaking/rotation) via IMU messages.
        
        User's specific request for this game:
        "${userRequest}"
        
        Project Context:
        ${fileSummary}
        
        Output a JSON object with:
        - name: Short catchy name
        - description: How to play
        - readme: A detailed Markdown README with "How to Play" and "How to Add More Content" sections.
        - code: The Python code for the game. 
          IMPORTANT: 
          1. If the project context shows a ROS2 strategy pattern, follow it exactly. 
          2. If it shows a MicroPython/M5Stack pattern, follow that.
          3. Put the game's vocabulary/rounds in a clearly defined Python list named "GAME_ROUNDS" at the top of the code.
        - mock_data: A JSON object representing the initial 6 screens for the simulator. 
          Format: {"top": {"type": "text" | "image", "content": "..."}, "bottom": ..., "front": ..., "back": ..., "left": ..., "right": ...}
        - mock_rounds: A JSON array of JSON strings, where each string represents the state of the 6 screens for a round (e.g., when shaken).
          Provide exactly 10 rounds for testing.
        - assets_manifest: (Optional) A JSON array listing the required assets.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const gameData = JSON.parse(response.text || "{}");
      
      // Prepend mock data comment to code for simulator compatibility
      const mockDataStr = JSON.stringify(gameData.mock_data || {});
      const codeWithMock = `# MOCK_SCREENS = ${mockDataStr}\n\n${gameData.code || ""}`;
      
      const res = await fetch('/api/language-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: gameData.name || "New Language Game",
          description: gameData.description || "A new game",
          code: codeWithMock,
          mock_data: mockDataStr,
          mock_rounds: gameData.mock_rounds || [],
          assets_manifest: gameData.assets_manifest ? JSON.stringify(gameData.assets_manifest) : undefined
        })
      });

      if (res.ok) {
        await fetchAndSetGames();
        
        // Create README file in the project
        const readmeContent = gameData.readme || `# ${gameData.name}\n\n${gameData.description}\n\n## How to Play\n1. Run the code in the simulator.\n2. Shake the dice to start.\n\n## How to Add More Content\nUpdate the GAME_ROUNDS list in the code.`;
        const readmePath = `games/${(gameData.name || "Game").replace(/\s+/g, '_')}_README.md`;
        
        const newReadme = { path: readmePath, content: readmeContent };
        setFiles(prev => [...prev, newReadme]);
        setSelectedFile(newReadme);
        
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err) {
      setError("Failed to generate language game.");
      console.error(err);
    } finally {
      setIsGeneratingGame(false);
    }
  };

  const enhanceGame = async (game: LanguageGame) => {
    setIsEnhancingGame(game.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Enhance this DiceMaster language game: "${game.name}".
        Description: ${game.description}
        Current Code: ${game.code}
        
        Requirements:
        1. Add more vocabulary items or rounds to reach a total of exactly 10 rounds.
        2. Ensure the code handles "imu0.was_shaken()" correctly to cycle through content.
        3. Put the vocabulary/rounds in a clearly defined Python list named "GAME_ROUNDS" at the top of the code.
        4. Provide a list of "mock_rounds" in JSON format that represent the state of all 6 screens for each of the 10 rounds.
        
        Return a JSON object with:
        {
          "description": "Updated description",
          "code": "Full updated Python code",
          "mock_rounds": ["JSON_STRING_1", "JSON_STRING_2", ...]
        }`,
        config: { responseMimeType: 'application/json' }
      });

      const data = JSON.parse(response.text);
      const updatedGame = {
        ...game,
        description: data.description,
        code: data.code,
        mock_rounds: data.mock_rounds
      };

      await fetch(`/api/language-games/${game.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedGame)
      });

      setLanguageGames(prev => prev.map(g => g.id === game.id ? updatedGame : g));
    } catch (err) {
      console.error("Failed to enhance game", err);
      setError("Failed to enhance game with AI.");
    } finally {
      setIsEnhancingGame(null);
    }
  };

  const updateGameContent = async (updatedGame: LanguageGame) => {
    try {
      const res = await fetch(`/api/language-games/${updatedGame.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedGame)
      });
      if (res.ok) {
        setLanguageGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
        setEditingGame(null);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update game content.");
    }
  };

  const deleteGame = async (id: number) => {
    try {
      await fetch(`/api/language-games/${id}`, { method: 'DELETE' });
      setLanguageGames(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const runGameInSimulator = (game: LanguageGame) => {
    try {
      let mockData = {};
      if (game.mock_data) {
        mockData = typeof game.mock_data === 'string' ? JSON.parse(game.mock_data) : game.mock_data;
      }
      setScreens(resolveScreens(mockData));
      setActiveGame(game);
      setCurrentRound(-1); // -1 means initial state
      setActiveTab('sim2d');
    } catch (err) {
      console.error("Invalid mock data", err);
      setError("Failed to parse game mock data.");
    }
  };

  const shakeDice = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);

    if (activeGame && activeGame.mock_rounds && activeGame.mock_rounds.length > 0) {
      const nextRoundIdx = (currentRound + 1) % activeGame.mock_rounds.length;
      setCurrentRound(nextRoundIdx);
      try {
        const roundData = activeGame.mock_rounds[nextRoundIdx];
        if (roundData) {
          const parsedRound = typeof roundData === 'string' ? JSON.parse(roundData) : roundData;
          setScreens(resolveScreens(parsedRound));
        }
      } catch (err) {
        console.error("Failed to parse round data", err);
      }
    } else {
      // Default demo shake behavior if no active game is selected
      const demoRounds = [
        {
          top: { type: 'text', content: 'DiceMaster' },
          bottom: { type: 'text', content: 'Round 1' },
          front: { type: 'text', content: 'Hello' },
          back: { type: 'text', content: 'Hola' },
          left: { type: 'text', content: 'Bonjour' },
          right: { type: 'text', content: 'Ciao' },
        },
        {
          top: { type: 'text', content: 'DiceMaster' },
          bottom: { type: 'text', content: 'Round 2' },
          front: { type: 'text', content: 'Apple' },
          back: { type: 'text', content: 'Manzana' },
          left: { type: 'text', content: 'Pomme' },
          right: { type: 'text', content: 'Mela' },
        },
        {
          top: { type: 'text', content: 'DiceMaster' },
          bottom: { type: 'text', content: 'Round 3' },
          front: { type: 'text', content: 'Water' },
          back: { type: 'text', content: 'Agua' },
          left: { type: 'text', content: 'Eau' },
          right: { type: 'text', content: 'Acqua' },
        }
      ];
      
      const nextRoundIdx = (currentRound + 1) % demoRounds.length;
      setCurrentRound(nextRoundIdx);
      setScreens(resolveScreens(demoRounds[nextRoundIdx]));
    }
  };

  const loadPythonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      // Try to extract mock data from comments
      // Look for: # MOCK_SCREENS = {"top": {"type": "text", "content": "..."}}
      const mockMatch = content.match(/#\s*MOCK_SCREENS\s*=\s*({.*})/);
      if (mockMatch) {
        try {
          const mockData = JSON.parse(mockMatch[1]);
          setScreens(resolveScreens(mockData));
        } catch (err) {
          console.error("Failed to parse mock data from file", err);
        }
      }

      const newFile = { path: file.name, content };
      setFiles(prev => {
        const existing = prev.findIndex(f => f.path === file.name);
        if (existing !== -1) {
          const updated = [...prev];
          updated[existing] = newFile;
          return updated;
        }
        return [...prev, newFile];
      });
      setSelectedFile(newFile);
      setActiveTab('editor');
    };
    reader.readAsText(file);
  };

  const addAllGamesToEditor = () => {
    if (languageGames.length === 0) return;
    
    setFiles(prev => {
      let newFiles = [...prev];
      languageGames.forEach(game => {
        const baseName = game.name.toLowerCase().replace(/\s+/g, '_');
        const fileName = `games/${baseName}.py`;
        const existingIndex = newFiles.findIndex(f => f.path === fileName);
        if (existingIndex !== -1) {
          newFiles[existingIndex] = { path: fileName, content: game.code };
        } else {
          newFiles.push({ path: fileName, content: game.code });
        }

        // Add manifest if it exists
        if (game.assets_manifest) {
          const manifestPath = `games/${baseName}_assets.json`;
          const manifestIndex = newFiles.findIndex(f => f.path === manifestPath);
          if (manifestIndex !== -1) {
            newFiles[manifestIndex] = { path: manifestPath, content: game.assets_manifest };
          } else {
            newFiles.push({ path: manifestPath, content: game.assets_manifest });
          }
        }
      });
      return newFiles;
    });
    
    // Select the first game added
    const firstGameFileName = `games/${languageGames[0].name.toLowerCase().replace(/\s+/g, '_')}.py`;
    setSelectedFile({ path: firstGameFileName, content: languageGames[0].code });
    setActiveTab('editor');
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const downloadGame = (game: LanguageGame) => {
    let content = game.code;
    // Ensure MOCK_SCREENS is in the code if it's not already
    if (!content.includes('MOCK_SCREENS')) {
      content = `# MOCK_SCREENS = ${game.mock_data}\n\n${content}`;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game.name.toLowerCase().replace(/\s+/g, '_')}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllGames = async () => {
    const zip = new JSZip();
    languageGames.forEach(game => {
      const fileName = `${game.name.toLowerCase().replace(/\s+/g, '_')}.py`;
      zip.file(fileName, game.code);
      zip.file(`${game.name.toLowerCase().replace(/\s+/g, '_')}_meta.json`, JSON.stringify({
        name: game.name,
        description: game.description,
        mock_data: game.mock_data,
        assets_manifest: game.assets_manifest
      }, null, 2));
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dice_language_games_backup.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const uploadGamesZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsGeneratingGame(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const gameFiles = Object.keys(zip.files).filter(name => name.endsWith('_meta.json'));
      
      for (const metaFile of gameFiles) {
        const metaContent = await zip.files[metaFile].async('string');
        const meta = JSON.parse(metaContent);
        
        const pyFile = metaFile.replace('_meta.json', '.py');
        let code = '';
        if (zip.files[pyFile]) {
          code = await zip.files[pyFile].async('string');
        }

        await fetch('/api/language-games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: meta.name,
            description: meta.description,
            code: code || meta.code,
            mock_data: meta.mock_data,
            assets_manifest: meta.assets_manifest
          })
        });
      }
      
      await fetchAndSetGames();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error("Failed to upload ZIP", err);
      setError("Failed to upload games ZIP. Make sure it's a valid backup.");
    } finally {
      setIsGeneratingGame(false);
    }
  };

  const uploadIndividualGamePy = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const name = file.name.replace('.py', '').replace(/_/g, ' ');
      
      // Try to extract mock data from comments
      const mockMatch = content.match(/#\s*MOCK_SCREENS\s*=\s*({.*})/);
      const mockData = mockMatch ? mockMatch[1] : JSON.stringify({
        top: { type: 'text', content: 'DiceMaster Quiz' },
        bottom: { type: 'text', content: 'Shake to Start' },
        front: { type: 'text', content: '?' },
        back: { type: 'text', content: '?' },
        left: { type: 'text', content: '?' },
        right: { type: 'text', content: '?' },
      });

      setIsGeneratingGame(true);
      try {
        await fetch('/api/language-games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            description: "Uploaded from .py file",
            code: content,
            mock_data: mockData
          })
        });
        
        await fetchAndSetGames();
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error("Failed to upload .py", err);
        setError("Failed to upload individual game.");
      } finally {
        setIsGeneratingGame(false);
      }
    };
    reader.readAsText(file);
  };

  const flashCode = async (code: string) => {
    if (!isUsbConnected) {
      setError("Please connect your dice via USB first.");
      return;
    }
    setIsFlashing(true);
    try {
      // Assuming we want to flash to main.py by default
      await serialService.flashFile('main.py', code);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setError("Flashing failed: " + (err as Error).message);
    } finally {
      setIsFlashing(false);
    }
  };

  const improveGame = async (game: LanguageGame) => {
    setIsGeneratingGame(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        Improve this language learning game for the 6-sided LCD dice.
        Current Game Name: ${game.name}
        Current Description: ${game.description}
        Current Code: ${game.code}
        
        User's improvement request: "${improvementPrompt}"
        
        Output a JSON object with the updated:
        - name
        - description
        - code
        - mock_data
      `;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const gameData = JSON.parse(response.text || "{}");
      
      // Prepend mock data comment to code for simulator compatibility
      const mockDataStr = JSON.stringify(gameData.mock_data || JSON.parse(game.mock_data));
      const codeWithMock = `# MOCK_SCREENS = ${mockDataStr}\n\n${gameData.code || game.code}`;
      
      const res = await fetch('/api/language-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: gameData.name || game.name,
          description: gameData.description || game.description,
          code: codeWithMock,
          mock_data: mockDataStr
        })
      });

      if (res.ok) {
        await fetchAndSetGames();
        setIsImprovingGame(null);
        setImprovementPrompt('');
      }
    } catch (err) {
      setError("Improvement failed.");
    } finally {
      setIsGeneratingGame(false);
    }
  };

  const uploadAsset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result as string;
        const res = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, data, type: file.type })
        });
        if (res.ok) {
          const assetsRes = await fetch('/api/assets');
          const assetsData = await assetsRes.json();
          setAssets(assetsData.assets);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to upload asset.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const generateAsset = async () => {
    if (!assetPrompt) return;
    setIsUploading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `A clear, high-quality, square icon or graphic of: ${assetPrompt}. Minimalist style, suitable for a small 240x240 LCD screen. White background or transparent-like.` }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      let base64Data = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64Data = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (base64Data) {
        const res = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: `ai_${assetPrompt.toLowerCase().replace(/\s+/g, '_')}.png`, 
            data: base64Data, 
            type: 'image/png' 
          })
        });
        if (res.ok) {
          const assetsRes = await fetch('/api/assets');
          const assetsData = await assetsRes.json();
          setAssets(assetsData.assets);
          setAssetPrompt('');
        }
      } else {
        throw new Error("No image data returned from AI.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate AI asset. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteAsset = async (id: number) => {
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const updateScreen = (face: string, content: string, type: 'text' | 'image' = 'text') => {
    setScreens(prev => ({
      ...prev,
      [face]: { type, content }
    }));
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 md:p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl w-full text-center mb-6 relative"
      >
        <div className="absolute right-0 top-0 hidden md:flex items-center gap-3">
          {isUsbConnected ? (
            <button 
              onClick={disconnectUsb}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-xs font-bold hover:bg-emerald-500/20 transition-all"
            >
              <Usb className="w-3 h-3" />
              Dice Connected
            </button>
          ) : (
            <button 
              onClick={connectUsb}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-zinc-500 rounded-xl border border-white/5 text-xs font-bold hover:bg-zinc-800 hover:text-white transition-all"
            >
              <Usb className="w-3 h-3" />
              Connect Dice
            </button>
          )}
        </div>

        <div className="inline-flex items-center justify-center p-2 bg-emerald-500/10 rounded-xl mb-3 border border-emerald-500/20">
          <Dice6 className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-2 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
          LCD Dice Mini-Games Lab
        </h1>
        <p className="text-zinc-400 text-xs md:text-sm max-w-2xl mx-auto px-4">
          Analyze, edit, and simulate your 6-sided LCD dice project.
        </p>
      </motion.div>

      <main className="max-w-7xl w-full space-y-4 px-2 md:px-0">
        {/* Success Toast */}
        <AnimatePresence>
          {saveStatus === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed bottom-8 right-8 z-50 bg-emerald-500 text-zinc-950 px-6 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5" />
              Operation Successful
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-white/5 pb-2 -mx-2 px-2 md:mx-0 md:px-0 md:flex-wrap">
          <button 
            onClick={() => setActiveTab('project')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
              activeTab === 'project' ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            )}
          >
            <Monitor className="w-4 h-4" />
            Project Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('editor')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
              activeTab === 'editor' ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            )}
          >
            <Code2 className="w-4 h-4" />
            Code Editor
          </button>
          <button 
            onClick={() => setActiveTab('sim2d')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
              activeTab === 'sim2d' ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            )}
          >
            <Layout className="w-4 h-4" />
            2D Simulator
          </button>
          <button 
            onClick={() => setActiveTab('sim3d')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
              activeTab === 'sim3d' ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            )}
          >
            <Box className="w-4 h-4" />
            3D Simulator
          </button>
          <button 
            onClick={() => setActiveTab('games')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
              activeTab === 'games' ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            )}
          >
            <Languages className="w-4 h-4" />
            Language Games
          </button>
          <button 
            onClick={() => setActiveTab('assets')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
              activeTab === 'assets' ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            )}
          >
            <Box className="w-4 h-4" />
            Asset Library
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
              activeTab === 'logs' ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            )}
          >
            <History className="w-4 h-4" />
            Log ({logs.length})
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
              activeTab === 'settings' ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            )}
          >
            <SettingsIcon className="w-4 h-4" />
            Settings
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'project' && (
            <motion.div
              key="project"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Upload Section */}
              {!files.length ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group"
                >
                  <label className={cn(
                    "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300",
                    "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-emerald-500/50",
                    isUploading && "opacity-50 cursor-not-allowed"
                  )}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="p-4 bg-zinc-800 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                        {isUploading ? (
                          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                        ) : (
                          <Upload className="w-8 h-8 text-zinc-400 group-hover:text-emerald-400" />
                        )}
                      </div>
                      <p className="mb-2 text-sm text-zinc-300">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">GitHub ZIP Export</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".zip" 
                      onChange={onFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  {/* Preview / Diff Section */}
                  {previewFiles && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="glass p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                              <RotateCw className="w-5 h-5 text-emerald-400" />
                              Review Changes
                            </h3>
                            <p className="text-sm text-zinc-400">Review the differences before committing to the project.</p>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                setPreviewFiles(null);
                                setPendingZip(null);
                                setBreakingAnalysis(null);
                              }}
                              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={commitChanges}
                              disabled={isUploading}
                              className="bg-emerald-500 text-zinc-950 px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-400 transition-all disabled:opacity-50"
                            >
                              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              Commit Changes
                            </button>
                          </div>
                        </div>

                        {/* Breaking Changes Analysis */}
                        {isAnalyzingBreaking ? (
                          <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 mb-6 flex items-center gap-3">
                            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                            <span className="text-sm text-zinc-400">Analyzing impact on language games...</span>
                          </div>
                        ) : breakingAnalysis && (
                          <div className={cn(
                            "p-4 rounded-2xl border mb-6",
                            breakingRisk === 'high' ? "bg-red-500/10 border-red-500/30" :
                            breakingRisk === 'medium' ? "bg-amber-500/10 border-amber-500/30" :
                            "bg-emerald-500/10 border-emerald-500/30"
                          )}>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                {breakingRisk === 'high' ? <ShieldAlert className="w-3 h-3 text-red-500" /> :
                                 breakingRisk === 'medium' ? <ShieldQuestion className="w-3 h-3 text-amber-500" /> :
                                 <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                                Impact Analysis (Risk: {breakingRisk})
                              </h4>
                            </div>
                            <div className="text-sm text-zinc-300 markdown-body prose prose-invert prose-sm max-w-none">
                              <Markdown>{breakingAnalysis}</Markdown>
                            </div>
                          </div>
                        )}

                        {/* Diff Viewer */}
                        <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                          {previewFiles.map(nf => {
                            const existing = files.find(f => f.path === nf.path);
                            if (existing && existing.content === nf.content) return null;
                            
                            return (
                              <div key={nf.path} className="space-y-2">
                                <div className="flex items-center gap-2 px-2">
                                  <FileCode className="w-4 h-4 text-zinc-500" />
                                  <span className="text-xs font-mono text-zinc-400">{nf.path}</span>
                                  {!existing && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-bold">New</span>}
                                  {existing && <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded uppercase font-bold">Modified</span>}
                                </div>
                                <div className="rounded-xl overflow-hidden border border-white/5 text-[12px]">
                                  <ReactDiffViewer
                                    oldValue={existing?.content || ''}
                                    newValue={nf.content}
                                    splitView={true}
                                    useDarkTheme={true}
                                    styles={{
                                      variables: {
                                        dark: {
                                          diffViewerBackground: '#18181b',
                                          addedBackground: '#064e3b',
                                          addedColor: '#34d399',
                                          removedBackground: '#7f1d1d',
                                          removedColor: '#f87171',
                                          wordAddedBackground: '#065f46',
                                          wordRemovedBackground: '#991b1b',
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* File List Summary */}
                  {!previewFiles && (
                    <div className="glass p-6 rounded-3xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Project Loaded</h3>
                          <p className="text-sm text-zinc-400">{files.length} files extracted</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <label className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer border border-emerald-500/20 px-3 py-1 rounded-lg bg-emerald-500/5">
                          Update Code
                          <input type="file" className="hidden" accept=".zip" onChange={onFileUpload} />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* DiceMaster Reference */}
                  <div className="glass p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-zinc-800 rounded-xl">
                        <Github className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">DiceMaster Reference</h3>
                        <p className="text-sm text-zinc-400">Programmable Multi-Screen Dice Project</p>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-300 mb-4">
                      This lab is the official DiceMaster project environment. You can explore the repository for advanced ROS2-based multi-screen logic and hardware designs.
                    </p>
                    <div className="flex gap-3">
                      <a 
                        href="https://github.com/DanielHou315/DiceMaster" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                      >
                        Visit Repository <ChevronRight className="w-3 h-3" />
                      </a>
                      <button 
                        onClick={loadGitHubCode}
                        className="text-xs font-bold text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                      >
                        Run Base Code <RotateCw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Action Button */}
                  {!analysis && (
                    <button
                      onClick={analyzeProject}
                      disabled={isAnalyzing}
                      className={cn(
                        "w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all duration-300",
                        "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 active:scale-[0.98]",
                        isAnalyzing && "opacity-70 cursor-not-allowed"
                      )}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Analyzing Codebase...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Analyze with AI
                    </>
                  )}
                </button>
              )}

              {/* Latest Analysis Results */}
              <AnimatePresence>
                {analysis && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="glass p-8 rounded-3xl">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-emerald-400" />
                          <h2 className="text-xl font-bold text-white">Latest Analysis</h2>
                        </div>
                        <button 
                          onClick={() => setAnalysis(null)}
                          className="text-xs text-zinc-500 hover:text-white"
                        >
                          Clear View
                        </button>
                      </div>
                      <div className="markdown-body prose prose-invert max-w-none">
                        <Markdown>{analysis}</Markdown>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'editor' && (
        <CodeEditor 
          files={files}
          selectedFile={selectedFile}
          isFlashing={isFlashing}
          isSaving={isSaving}
          saveStatus={saveStatus === 'success' ? 'success' : 'idle'}
          isUsbConnected={isUsbConnected}
          onFileSelect={setSelectedFile}
          onRunCurrentCode={runCurrentCode}
          onFlashCode={flashCode}
          onSaveFile={saveFile}
          onNewFile={createNewFile}
          onDeleteFile={deleteFile}
          onDownloadProject={downloadProject}
          fontSize={editorFontSize}
          theme={theme}
          onCodeChange={(val) => {
            if (selectedFile && val !== undefined && val !== selectedFile.content) {
              const updatedFile = { ...selectedFile, content: val };
              setSelectedFile(updatedFile);
              setFiles(prev => {
                const index = prev.findIndex(f => f.path === selectedFile.path);
                if (index === -1 || prev[index].content === val) return prev;
                const newFiles = [...prev];
                newFiles[index] = updatedFile;
                return newFiles;
              });
            }
          }}
        />
      )}

      {activeTab === 'sim2d' && (
        <Simulator2D 
          screens={screens}
          isShaking={isShaking}
          isAnalyzing={isAnalyzing}
          onRunCurrentCode={runCurrentCode}
          onLoadFile={() => fileInputRef.current?.click()}
          onLoadBaseCode={loadGitHubCode}
          onShakeDice={shakeDice}
          onUpdateScreen={updateScreen}
          shakeSensitivity={shakeSensitivity}
          activeGame={activeGame}
          files={files}
          onGenerateInstructions={generateGameInstructions}
          onEditInstructions={editInstructions}
          onExpandGameData={expandGameData}
          isExpandingData={isExpandingData}
        />
      )}

      {activeTab === 'sim3d' && (
        <Simulator3DContainer 
          screens={screens}
          isShaking={isShaking}
          isAnalyzing={isAnalyzing}
          onRunCurrentCode={runCurrentCode}
          onLoadFile={() => fileInputRef.current?.click()}
          onLoadBaseCode={loadGitHubCode}
          onShakeDice={shakeDice}
          onUpdateScreen={updateScreen}
          shakeSensitivity={shakeSensitivity}
          activeGame={activeGame}
          files={files}
          onGenerateInstructions={generateGameInstructions}
          onEditInstructions={editInstructions}
          onExpandGameData={expandGameData}
          isExpandingData={isExpandingData}
        />
      )}

      {activeTab === 'games' && (
        <GamesView 
          games={languageGames}
          isGenerating={isGeneratingGame}
          gamePrompt={gamePrompt}
          setGamePrompt={setGamePrompt}
          onGenerateGame={createLanguageGame}
          onSimulate={runGameInSimulator}
          onDelete={deleteGame}
          onEnhance={enhanceGame}
          onEditContent={setEditingGame}
          isEnhancingId={isEnhancingGame}
          onFlash={flashCode}
          onDownload={downloadGame}
          onDownloadAll={downloadAllGames}
          onUploadZip={uploadGamesZip}
          onUploadPy={uploadIndividualGamePy}
          onAddAllToEditor={addAllGamesToEditor}
          onViewCode={(g) => {
            setSelectedFile({ path: `games/${g.name.toLowerCase().replace(/\s+/g, '_')}.py`, content: g.code });
            setActiveTab('editor');
          }}
          onInjectFeatured={() => injectFeaturedGame(languageGames)}
        />
      )}

      {activeTab === 'assets' && (
        <AssetsView 
          assets={assets}
          isGenerating={isUploading}
          assetPrompt={assetPrompt}
          setAssetPrompt={setAssetPrompt}
          onGenerateAsset={generateAsset}
          onUpload={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e: any) => uploadAsset(e);
            input.click();
          }}
          onDelete={deleteAsset}
          onCopy={(data) => {
            navigator.clipboard.writeText(data);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 1000);
          }}
        />
      )}

      {activeTab === 'logs' && (
        <motion.div
          key="logs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-6"
        >
          {logs.length === 0 ? (
            <div className="text-center py-20 glass rounded-3xl">
              <History className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-500">No suggestions logged yet.</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="glass p-8 rounded-3xl relative group">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                  <span className="text-xs font-mono text-zinc-500">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="markdown-body prose prose-invert max-w-none max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                  <Markdown>{log.content}</Markdown>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {activeTab === 'settings' && (
        <SettingsView 
          theme={theme}
          setTheme={setTheme}
          autoSave={autoSave}
          setAutoSave={setAutoSave}
          fontSize={editorFontSize}
          setFontSize={setEditorFontSize}
          shakeSensitivity={shakeSensitivity}
          setShakeSensitivity={setShakeSensitivity}
          onResetData={resetAllData}
          isUsbConnected={isUsbConnected}
          onConnectUsb={connectUsb}
          onDisconnectUsb={disconnectUsb}
        />
      )}
      </AnimatePresence>

      {editingGame && (
        <GameContentEditor 
          game={editingGame}
          onClose={() => setEditingGame(null)}
          onSave={updateGameContent}
        />
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 mt-6 max-w-4xl w-full"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto pt-12 text-zinc-600 text-sm flex items-center gap-2">
        <FileCode className="w-4 h-4" />
        <span>Built for Alfonso's DiceMaster Project</span>
      </footer>
    </div>
  );
}
