import React from 'react';
import { motion } from 'motion/react';
import { FileCode, Play, Zap, Loader2, Save, Plus, Trash2, Download } from 'lucide-react';
import Editor from "@monaco-editor/react";
import { ProjectFile } from '../../types';
import { cn } from '../../lib/utils';

interface CodeEditorProps {
  files: ProjectFile[];
  selectedFile: ProjectFile | null;
  isFlashing: boolean;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'success';
  isUsbConnected: boolean;
  onFileSelect: (file: ProjectFile) => void;
  onRunCurrentCode: () => void;
  onFlashCode: (code: string) => void;
  onSaveFile: () => void;
  onNewFile: () => void;
  onDeleteFile: (path: string) => void;
  onDownloadProject: () => void;
  onCodeChange: (value: string | undefined) => void;
  fontSize: number;
  theme: 'light' | 'dark';
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  files,
  selectedFile,
  isFlashing,
  isSaving,
  saveStatus,
  isUsbConnected,
  onFileSelect,
  onRunCurrentCode,
  onFlashCode,
  onSaveFile,
  onNewFile,
  onDeleteFile,
  onDownloadProject,
  onCodeChange,
  fontSize,
  theme
}) => {
  return (
    <motion.div
      key="editor"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="h-auto lg:h-[calc(100vh-12rem)] flex flex-col lg:flex-row gap-6"
    >
      {/* File Explorer */}
      <div className="w-full lg:w-64 glass rounded-3xl overflow-hidden flex flex-col border border-white/5 shrink-0">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Files</h3>
          <div className="flex gap-1">
            <button 
              onClick={onNewFile}
              className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-emerald-400 transition-colors"
              title="New File"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button 
              onClick={onDownloadProject}
              className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-emerald-400 transition-colors"
              title="Download Project"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 max-h-48 lg:max-h-none overflow-y-auto p-2 space-y-1">
          {files.map((file) => (
            <div key={file.path} className="group flex items-center gap-1">
              <button
                onClick={() => onFileSelect(file)}
                className={cn(
                  "flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all text-left truncate",
                  selectedFile?.path === file.path 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                )}
              >
                <FileCode className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{file.path.split('/').pop()}</span>
              </button>
              {file.path !== 'main.py' && file.path !== 'github_base.py' && (
                <button 
                  onClick={() => onDeleteFile(file.path)}
                  className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-zinc-500 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 glass rounded-3xl overflow-hidden flex flex-col relative min-h-[500px] lg:min-h-0">
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-zinc-900/50 gap-4">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-mono text-zinc-300 truncate max-w-[150px] sm:max-w-none">{selectedFile?.path || 'No file selected'}</span>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={onRunCurrentCode}
              disabled={!selectedFile}
              className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <Play className="w-4 h-4 fill-current" />
              Run
            </button>
            <button
              onClick={() => onFlashCode(selectedFile?.content || '')}
              disabled={isFlashing || !selectedFile || !isUsbConnected}
              className={cn(
                "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all",
                isUsbConnected 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20" 
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
              title={isUsbConnected ? "Flash to Physical Dice" : "Connect Dice via USB first"}
            >
              {isFlashing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className={cn("w-4 h-4", isUsbConnected && "fill-current")} />}
              Flash
            </button>
            <button
              onClick={onSaveFile}
              disabled={isSaving || !selectedFile}
              className={cn(
                "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all",
                saveStatus === 'success' ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-white hover:bg-zinc-700",
                isSaving && "opacity-50"
              )}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saveStatus === 'success' ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>
        <div className="flex-1">
          <Editor
            height="100%"
            theme={theme === 'dark' ? "vs-dark" : "light"}
            language="python"
            value={selectedFile?.content || ''}
            onChange={onCodeChange}
            options={{
              minimap: { enabled: false },
              fontSize: fontSize,
              fontFamily: "'JetBrains Mono', monospace",
              padding: { top: 20 },
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              lineNumbersMinChars: 3,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};
