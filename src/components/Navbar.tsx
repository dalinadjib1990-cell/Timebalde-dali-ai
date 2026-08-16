import React from 'react';
import {
  FileSpreadsheet,
  Calendar,
  Sparkles,
  Users,
  GraduationCap,
  DoorClosed,
  Scale,
  AlertTriangle,
  ShieldCheck,
  UploadCloud,
  Layers,
} from 'lucide-react';

export type ActiveTab =
  | 'official_rules'
  | 'timetables'
  | 'ai_scheduler'
  | 'teachers'
  | 'classes'
  | 'rooms'
  | 'legal_rules'
  | 'conflicts'
  | 'validation';

interface Props {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  conflictCount: number;
  onOpenDocumentUpdater: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  conflictCount,
  onOpenDocumentUpdater,
}) => {
  const tabs = [
    {
      id: 'official_rules' as ActiveTab,
      name: 'المواقيت والمعاملات الرسمية',
      icon: FileSpreadsheet,
      badge: 'المرجع الوزاري 2026',
    },
    {
      id: 'timetables' as ActiveTab,
      name: 'استعمال الزمن التفاعلي',
      icon: Calendar,
    },
    {
      id: 'ai_scheduler' as ActiveTab,
      name: 'المولد الذكي و DALI AI',
      icon: Sparkles,
      highlight: true,
    },
    {
      id: 'teachers' as ActiveTab,
      name: 'هيئة التدريس والنصاب',
      icon: Users,
    },
    {
      id: 'classes' as ActiveTab,
      name: 'الأقسام التربوية',
      icon: GraduationCap,
    },
    {
      id: 'rooms' as ActiveTab,
      name: 'القاعات والمخابر',
      icon: DoorClosed,
    },
    {
      id: 'legal_rules' as ActiveTab,
      name: 'محرك القوانين والقرارات',
      icon: Scale,
    },
    {
      id: 'conflicts' as ActiveTab,
      name: 'كاشف التعارضات',
      icon: AlertTriangle,
      badgeCount: conflictCount,
    },
    {
      id: 'validation' as ActiveTab,
      name: 'شهادة المطابقة الوزارية',
      icon: ShieldCheck,
    },
  ];

  return (
    <header className="bg-[#0a0a0a] text-[#e0e0e0] border-b border-[#222] sticky top-0 z-40 shadow-xl">
      {/* Top Identity Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#8a701e] flex items-center justify-center font-black text-black shadow-lg text-lg">
            🇩🇿
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-[#d4af37]">
                DALI TIMETABLE AI
              </span>
              <span className="bg-[#1a120a] text-[#d4af37] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#d4af37]/30">
                المتوسطة الجزائرية 2026/2027
              </span>
            </div>
            <div className="text-[11px] text-[#666] font-medium">
              نظام الجدولة الذكي المعتمد على ملحق القرار الوزاري المؤرخ في 27 جويلية 2026
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="open-doc-updater-nav-btn"
            onClick={onOpenDocumentUpdater}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#161616] hover:bg-[#222] border border-[#d4af37]/40 text-[#d4af37] text-xs font-semibold rounded-xl transition-all shadow-xs"
            title="مقارنة وتحديث أي وثيقة أو منشور وزاري جديد بواسطة الذكاء الاصطناعي"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>تحديث وثيقة وزارية</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-[#050505] border-t border-[#1a1a1a] px-4 sm:px-6 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 min-w-max py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#161616] text-[#d4af37] border border-[#d4af37]/40 shadow-[0_0_12px_rgba(212,175,55,0.12)] font-bold'
                    : 'text-[#999] hover:bg-[#0f0f0f] hover:text-white border border-transparent'
                }`}
              >
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] shadow-[0_0_6px_#d4af37]" />
                )}
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#d4af37]' : 'text-[#777]'}`} />
                <span>{tab.name}</span>

                {tab.badge && (
                  <span className="text-[9px] bg-[#1a2e1a] text-[#4ade80] border border-[#4ade80]/30 px-1.5 py-0.5 rounded font-mono">
                    {tab.badge}
                  </span>
                )}

                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span className="text-[10px] bg-[#ff4444]/20 text-[#ff4444] border border-[#ff4444]/40 px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                    {tab.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
