import React from 'react';
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
  '«اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا ، وَرِزْقًا طَيِّبًا ، وَعَمَلاً مُتَقَبَّلاً»',
];

export const IslamicTopBar: React.FC<IslamicTopBarProps> = ({
  isDarkMode,
  onToggleTheme,
  isMuted,
  onToggleSound,
}) => {
  return (
    <header
      id="islamic-top-header"
      className="relative z-50 h-10 min-h-[40px] max-h-[40px] w-full overflow-hidden border-b border-[#2a2a2a] shadow-xs select-none"
    >
      {/* Dynamic Animated Gradient Background */}
      <div className="shimmer-bar-bg h-full w-full px-2 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 flex-nowrap text-white relative">
        {/* Subtle moving light shimmer */}
        <div className="absolute inset-0 pointer-events-none shimmer-gold-line opacity-30" />

        {/* Right Badge: أذكار المسلم */}
        <div className="flex items-center gap-1.5 shrink-0 z-10 pl-2 border-l border-white/15">
          <span className="inline-flex items-center gap-1.5 bg-[#d4af37]/20 border border-[#d4af37]/60 text-[#ffd700] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold shadow-xs whitespace-nowrap">
            <Sparkles className="w-3 h-3 text-[#ffd700] animate-pulse shrink-0" />
            <span className="tracking-wide">أذكار المسلم</span>
          </span>
        </div>

        {/* Center: Single-line Smooth Continuous Moving Dhikr Ticker */}
        <div className="flex-1 min-w-0 h-full overflow-hidden relative flex items-center" dir="ltr">
          {/* Edge fade masks */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#09111e] to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#09111e] to-transparent z-10" />

          {/* Marquee ticker track */}
          <div className="animate-dhikr-ticker items-center gap-8 text-[#fef9c3] font-serif text-xs sm:text-sm font-medium tracking-wide">
            {DHIKR_ITEMS.concat(DHIKR_ITEMS).map((item, idx) => (
              <span
                key={idx}
                dir="rtl"
                className="inline-flex items-center gap-3 whitespace-nowrap shrink-0 hover:text-[#d4af37] transition-colors cursor-default"
              >
                <span>{item}</span>
                <span className="text-[#d4af37] text-xs opacity-75">✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* Left Controls: Sound Toggle + Dark/Light Theme Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 z-10 pr-2 border-r border-white/15">
          {/* Sound Toggle Button */}
          <button
            id="topbar-sound-toggle-btn"
            onClick={() => {
              onToggleSound();
              soundManager.playClick();
            }}
            className={`inline-flex items-center justify-center gap-1 px-2 py-1 sm:px-2.5 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${
              isMuted
                ? 'bg-red-950/70 text-red-300 border-red-500/50 hover:bg-red-900/90'
                : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/90'
            }`}
            title={isMuted ? 'تفعيل المؤثرات الصوتية (صوت حالياً مكتوم)' : 'كتم المؤثرات الصوتية (صوت مفعّل)'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="hidden md:inline">صوت مكتوم</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
                <span className="hidden md:inline">صوت مفعّل</span>
              </>
            )}
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            id="topbar-theme-toggle-btn"
            onClick={() => {
              onToggleTheme();
              soundManager.playToggle(!isDarkMode);
            }}
            className="inline-flex items-center justify-center gap-1 px-2 py-1 sm:px-2.5 rounded-full text-[11px] font-medium bg-[#1e293b]/90 hover:bg-[#334155] text-amber-200 border border-amber-400/40 transition-all cursor-pointer shadow-xs"
            title={isDarkMode ? 'التبديل إلى الوضع المضيء (نهار)' : 'التبديل إلى الوضع المظلم (ليل)'}
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden md:inline">مضيء</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span className="hidden md:inline">مظلم</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
