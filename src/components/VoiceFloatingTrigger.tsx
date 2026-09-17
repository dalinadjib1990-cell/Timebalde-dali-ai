import React from 'react';
import { Mic, Sparkles } from 'lucide-react';
import { soundManager } from '../services/soundService';

interface Props {
  onClick: () => void;
  isListening?: boolean;
}

export const VoiceFloatingTrigger: React.FC<Props> = ({ onClick, isListening = false }) => {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 animate-in slide-in-from-bottom-5">
      <button
        id="voice-assistant-trigger"
        onClick={() => {
          soundManager.playClick();
          onClick();
        }}
        className="group relative flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#d4af37] text-black font-black text-xs shadow-2xl hover:shadow-[#d4af37]/40 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20"
        title="تحدث مع المولد الذكي صوتياً لتعديل أو تحريك الحصص فوراً"
      >
        {/* Glow & Aura */}
        <span className="absolute -inset-0.5 rounded-2xl bg-[#d4af37] opacity-40 blur-md group-hover:opacity-75 transition-opacity -z-10" />

        <div className="w-8 h-8 rounded-xl bg-black text-[#d4af37] flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
          <Mic className="w-4 h-4" />
        </div>

        <div className="flex flex-col text-right">
          <div className="flex items-center gap-1.5 leading-tight">
            <span>التحكم الصوتي الفوري</span>
            <Sparkles className="w-3 h-3 text-black" />
          </div>
          <span className="text-[10px] font-semibold text-black/80 font-sans">
            تحدث لتعديل الجدول مباشرة
          </span>
        </div>
      </button>
    </div>
  );
};
