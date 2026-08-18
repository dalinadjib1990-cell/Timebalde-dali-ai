import React, { useState, useEffect } from 'react';
import { Sparkles, Moon, Volume2, VolumeX, Sun } from 'lucide-react';
import { soundManager } from '../services/soundService';

interface IslamicTopBarProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  isMuted: boolean;
  onToggleSound: () => void;
}

const DHIKR_ITEMS = [
  '﷽ «سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ»',
  '«لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ»',
  '«اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِينَ»',
  '«أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ»',
  '«رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِّن لِّسَانِي يَفْقَهُوا قَوْلِي»',
  '«رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ»',
  '«يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ أَصْلِحْ لِي شَأْنِي كُلَّهُ وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ»',
  '«لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ»',
  '«اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا ، وَرِزْقًا طَيِّبًا ، وَعَمَلاً مُتَقَبَّلاً»'
];

export const IslamicTopBar: React.FC<IslamicTopBarProps> = ({
  isDarkMode,
  onToggleTheme,
  isMuted,
  onToggleSound,
}) => {
  return (
    <div className="relative overflow-hidden z-50 border-b border-[#2a2a2a] shadow-md">
      {/* Dynamic Color Strip with moving wave shimmer */}
      <div className="shimmer-bar-bg py-2 px-3 flex items-center justify-between text-xs text-white relative">
        {/* Animated Light Shimmer overlay line */}
        <div className="absolute inset-0 pointer-events-none shimmer-gold-line opacity-40"></div>

        {/* Right side Islamic Badge with gentle glow */}
        <div className="flex items-center gap-2 shrink-0 z-10 pr-2 pl-4 border-l border-white/20">
          <span className="flex items-center gap-1.5 bg-[#d4af37]/20 border border-[#d4af37]/60 text-[#ffd700] px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#ffd700] animate-pulse" />
            <span className="tracking-wide">أذكار المسلم</span>
          </span>
        </div>

        {/* Smooth Moving Dhikr Text Marquee */}
        <div className="flex-1 overflow-hidden relative mx-3" dir="rtl">
          <div className="animate-dhikr-marquee font-serif text-sm font-semibold tracking-wide text-[#fef9c3] drop-shadow-sm flex items-center gap-10">
            {DHIKR_ITEMS.concat(DHIKR_ITEMS).map((item, idx) => (
              <span key={idx} className="flex items-center gap-4 hover:text-[#d4af37] transition-colors cursor-default">
                <span>{item}</span>
                <span className="text-[#d4af37] text-xs">✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* Left Side Controls: Sound Toggle + Dark/Light Theme Toggle */}
        <div className="flex items-center gap-2 shrink-0 z-10 pl-2 pr-3 border-r border-white/20">
          {/* Sound Toggle Button */}
          <button
            onClick={() => {
              onToggleSound();
              soundManager.playClick();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${
              isMuted
                ? 'bg-red-950/60 text-red-300 border-red-500/40 hover:bg-red-900/80'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/80'
            }`}
            title={isMuted ? 'تفعيل المؤثرات الصوتية' : 'كتم الصوت'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">الصوت مكتوم</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">الصوت مفعّل</span>
              </>
            )}
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={() => {
              onToggleTheme();
              soundManager.playToggle(!isDarkMode);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#1e293b]/80 hover:bg-[#334155] text-amber-200 border border-amber-400/40 transition-all cursor-pointer shadow-sm"
            title={isDarkMode ? 'التبديل إلى الوضع المضيء' : 'التبديل إلى الوضع المظلم'}
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">مضيء</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-300" />
                <span className="hidden sm:inline">مظلم</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
