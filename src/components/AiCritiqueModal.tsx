import React, { useState } from 'react';
import {
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Building2,
  ArrowRight,
  Save,
  RefreshCw,
  X,
  MessageSquare,
  ThumbsUp,
  Sliders,
} from 'lucide-react';

export interface AiCritiqueData {
  score: number;
  verdict: string;
  frankSummary: string;
  strengths: string[];
  weaknesses: string[];
  teacherComfortRating: string;
  annexEvaluation: string;
  finalRecommendation: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  critique: AiCritiqueData | null;
  isLoading: boolean;
  onSaveVersion: (name?: string, notes?: string) => void;
  onRegenerateWithComfort: () => void;
  onNavigateToTimetables: () => void;
}

export const AiCritiqueModal: React.FC<Props> = ({
  isOpen,
  onClose,
  critique,
  isLoading,
  onSaveVersion,
  onRegenerateWithComfort,
  onNavigateToTimetables,
}) => {
  const [versionName, setVersionName] = useState('النسخة النموذجية المعتمدة 2026/2027');
  const [versionNotes, setVersionNotes] = useState('نسخة معتمدة بعد تقييم الذكاء الاصطناعي وضبط أنصبة الأساتذة');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveVersion(versionName, versionNotes);
    setIsSaved(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#0e0e0e] border border-[#d4af37]/50 rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1c1608] border border-[#d4af37]/60 flex items-center justify-center text-[#d4af37]">
              <Sparkles className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div>
              <div className="text-[11px] text-[#888] font-bold">
                تقييم المستشار البيداغوجي الذكي — DALI AI
              </div>
              <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                <span>رأي الذكاء الاصطناعي الصريح في استعمال الزمن المولد</span>
                {critique && (
                  <span className="text-xs bg-[#1f1708] text-[#d4af37] px-2.5 py-0.5 rounded-full border border-[#d4af37]/40 font-extrabold">
                    {critique.score} / 10
                  </span>
                )}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#222] text-[#888] rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-sm font-bold text-[#d4af37]">
              جاري فحص الجدول وتقديم الرأي الصريح بالذكاء الاصطناعي...
            </div>
            <p className="text-xs text-[#888]">
              يتم قياس راحة الأساتذة، تتابع الحصص، تنقل الملحقة، والتوزيع الصباحي للمواد الأساسية.
            </p>
          </div>
        ) : critique ? (
          <div className="space-y-4 text-xs">
            {/* Verdict and Score Banner */}
            <div className="p-4 bg-gradient-to-r from-[#181308] to-[#141414] border border-[#d4af37]/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[11px] text-[#888]">التقييم العام للجدول:</div>
                <div className="text-sm md:text-base font-extrabold text-[#d4af37] flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  <span>{critique.verdict}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-[#0a0a0a] px-3.5 py-2 rounded-xl border border-[#333]">
                <span className="text-[11px] text-[#888]">درجة الجودة:</span>
                <span className="text-lg font-black text-white font-mono">{critique.score}</span>
                <span className="text-xs text-[#888]">/ 10</span>
              </div>
            </div>

            {/* Frank Summary */}
            <div className="p-4 bg-[#141414] border border-[#262626] rounded-2xl space-y-1.5">
              <div className="font-bold text-[#d4af37] flex items-center gap-1.5 text-xs">
                <MessageSquare className="w-4 h-4" />
                <span>الرأي الصريح والمباشر للمدير (بدون مجاملات):</span>
              </div>
              <p className="text-[#ccc] text-xs leading-relaxed font-medium">
                {critique.frankSummary}
              </p>
            </div>

            {/* Two Columns: Strengths and Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Strengths */}
              <div className="p-3.5 bg-[#121c14] border border-emerald-500/30 rounded-2xl space-y-2">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>نقاط القوة الصريحة:</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-[#bbb]">
                  {critique.strengths.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses / Notes */}
              <div className="p-3.5 bg-[#1f1515] border border-amber-500/30 rounded-2xl space-y-2">
                <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>نقاط تستوجب انتباه المدير:</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-[#bbb]">
                  {critique.weaknesses.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Ratings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-[#141414] border border-[#262626] rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1e1528] border border-[#c084fc]/40 flex items-center justify-center text-[#c084fc] shrink-0">
                  <Heart className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] text-[#888]">راحة الأساتذة والفراغات:</div>
                  <div className="font-bold text-white text-xs">{critique.teacherComfortRating}</div>
                </div>
              </div>

              <div className="p-3 bg-[#141414] border border-[#262626] rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#141d24] border border-[#38bdf8]/40 flex items-center justify-center text-[#38bdf8] shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] text-[#888]">تنقل أساتذة الملحقة:</div>
                  <div className="font-bold text-white text-xs">{critique.annexEvaluation}</div>
                </div>
              </div>
            </div>

            {/* Recommendation Box */}
            <div className="p-3.5 bg-[#181508] border border-[#d4af37]/40 rounded-2xl flex items-start gap-2.5">
              <ThumbsUp className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-[#d4af37] text-xs">توصية المستشار الصريحة:</div>
                <p className="text-[#ccc] text-xs leading-relaxed">
                  {critique.finalRecommendation}
                </p>
              </div>
            </div>

            {/* Save Version Sub-Card */}
            <div className="p-3.5 bg-[#0a0a0a] border border-[#262626] rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>حفظ هذا التوليد كنسخة رسمية معتمدة للمؤسسة:</span>
                </span>
                {isSaved && (
                  <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تم الحفظ في السجل بنجاح!</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="اسم النسخة..."
                  className="p-2 bg-[#141414] border border-[#333] rounded-lg text-white text-xs focus:border-[#d4af37] outline-hidden font-bold"
                />
                <input
                  type="text"
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  placeholder="ملاحظات حول النسخة..."
                  className="p-2 bg-[#141414] border border-[#333] rounded-lg text-white text-xs focus:border-[#d4af37] outline-hidden placeholder-[#666]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isSaved}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSaved
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : 'bg-[#d4af37] hover:bg-[#c59e2e] text-black shadow'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaved ? 'تم حفظ النسخة' : '💾 حفظ التوليد الآن'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Modal Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#222]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onRegenerateWithComfort();
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#141b24] hover:bg-[#1e2a38] text-[#38bdf8] border border-[#38bdf8]/40 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>🔄 توليد خيار آخر بمراعاة راحة الأستاذ والملحقة</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onNavigateToTimetables();
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black font-extrabold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
            >
              <span>استعراض استعمال الزمن التفاعلي</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-[#222] hover:bg-[#2c2c2c] text-[#ccc] rounded-xl text-xs font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
