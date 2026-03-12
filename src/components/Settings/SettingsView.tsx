import React from 'react';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Moon, Sun, Save, Type, RotateCw, Trash2, Info, Github, ExternalLink, Usb, ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SettingsViewProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  autoSave: boolean;
  setAutoSave: (val: boolean) => void;
  fontSize: number;
  setFontSize: (val: number) => void;
  shakeSensitivity: number;
  setShakeSensitivity: (val: number) => void;
  onResetData: () => void;
  isUsbConnected: boolean;
  onConnectUsb: () => void;
  onDisconnectUsb: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  setTheme,
  autoSave,
  setAutoSave,
  fontSize,
  setFontSize,
  shakeSensitivity,
  setShakeSensitivity,
  onResetData,
  isUsbConnected,
  onConnectUsb,
  onDisconnectUsb
}) => {
  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-8 pb-20"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <SettingsIcon className="w-5 h-5 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Application Settings</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance Section */}
        <section className="glass p-6 rounded-3xl space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-4 h-4 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Appearance</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Theme Mode</p>
                <p className="text-xs text-zinc-500">Switch between light and dark themes</p>
              </div>
              <div className="flex bg-zinc-900 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    theme === 'light' ? "bg-emerald-500 text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-white"
                  )}
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    theme === 'dark' ? "bg-emerald-500 text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-white"
                  )}
                >
                  <Moon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Editor Font Size</p>
                <span className="text-xs font-mono text-emerald-400">{fontSize}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="24"
                step="1"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        </section>

        {/* Behavior Section */}
        <section className="glass p-6 rounded-3xl space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <RotateCw className="w-4 h-4 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Behavior</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Auto-Save Editor</p>
                <p className="text-xs text-zinc-500">Automatically save changes while typing</p>
              </div>
              <button
                onClick={() => setAutoSave(!autoSave)}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  autoSave ? "bg-emerald-500" : "bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                  autoSave ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Shake Sensitivity</p>
                <span className="text-xs font-mono text-emerald-400">{shakeSensitivity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={shakeSensitivity}
                onChange={(e) => setShakeSensitivity(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        </section>

        {/* USB Hardware Section */}
        <section className="glass p-6 rounded-3xl space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Usb className="w-4 h-4 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">USB Hardware</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Dice Connection</p>
                <p className="text-xs text-zinc-500">Connect your physical dice via USB</p>
              </div>
              <div className="flex items-center gap-3">
                {isUsbConnected ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    Connected
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold bg-zinc-900 px-3 py-1 rounded-full border border-white/5">
                    <ShieldAlert className="w-3 h-3" />
                    Disconnected
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={isUsbConnected ? onDisconnectUsb : onConnectUsb}
              className={cn(
                "w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                isUsbConnected 
                  ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white" 
                  : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              )}
            >
              <Usb className="w-4 h-4" />
              {isUsbConnected ? 'Disconnect Dice' : 'Connect Physical Dice'}
            </button>
            
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Requires a browser that supports the Web Serial API (Chrome, Edge, Opera). 
              Ensure your dice is in bootloader or REPL mode.
            </p>
          </div>
        </section>

        {/* Data Management */}
        <section className="glass p-6 rounded-3xl space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 className="w-4 h-4 text-red-400" />
            <h3 className="text-lg font-bold text-white">Data Management</h3>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
              <p className="text-xs text-red-400 mb-3">
                Resetting data will clear all language games, assets, and project files. This action cannot be undone.
              </p>
              <button
                onClick={onResetData}
                className="w-full py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
                Reset All Application Data
              </button>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="glass p-6 rounded-3xl space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">About DiceMaster Lab</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Version</span>
              <span className="text-white font-mono">2.4.0-stable</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Environment</span>
              <span className="text-emerald-400 font-mono">Development</span>
            </div>
            
            <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
              <a 
                href="https://github.com/DanielHou315/DiceMaster" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Github className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                  <span className="text-xs text-zinc-400 group-hover:text-white">DiceMaster Core Repository</span>
                </div>
                <ExternalLink className="w-3 h-3 text-zinc-600" />
              </a>
            </div>
          </div>
        </section>
      </div>

      <div className="text-center">
        <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em]">
          Crafted for Language Explorers & Hardware Hackers
        </p>
      </div>
    </motion.div>
  );
};
