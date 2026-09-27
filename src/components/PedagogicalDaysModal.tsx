import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  AlertCircle,
  X,
  RefreshCw,
  Layers,
  BookOpen,
} from 'lucide-react';
import { Teacher, InstitutionConfig, SubjectId, SchoolClass } from '../types';
import { SUBJECT_METADATA } from '../data/officialData';
import {
  assignPedagogicalDaysWithAi,
  PedagogicalDayAssignmentResult,
  OFFICIAL_ALGERIAN_PEDAGOGICAL_SCHEDULE,
} from '../services/pedagogicalDaysAiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  config: InstitutionConfig;
  classes: SchoolClass[];
  onApplyAssignments: (updatedTeachers: Teacher[], updatedConfig: InstitutionConfig) => void;
}

export const PedagogicalDaysModal: React.FC<Props> = ({
  isOpen,
  onClose,
  teachers,
  config,
  classes,
  onApplyAssignments,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PedagogicalDayAssignmentResult | null>(null);

  if (!isOpen) return null;

  const handleRunAiAllocation = async () => {
    setLoading(true);
    try {
      const res = await assignPedagogicalDaysWithAi(teachers, config, classes);
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmApply = () => {
    if (result) {
      onApplyAssignments(result.updatedTeachers, result.updatedConfig);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#0c0c0c] border border-[#d4af37]/40 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1a120a] border border-[#d4af37]/50 flex items-center justify-center text-[#d4af37]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>تحديد وتوزيع الأيام البيداغوجية بالذكاء الاصطناعي 🧠</span>
                <span className="text-[10px] bg-[#1a120a] text-[#d4af37] px-2 py-0.5 rounded-full border border-[#d4af37]/30">
                  وزارة التربية الوطنية
                </span>
              </h3>
              <p className="text-xs text-[#888] mt-0.5">
                توزيع فترات التنسيق والندوات البيداغوجية لكل مادة وهيئة التدريس مع منع شغور المؤسسة وقفل الحصص تلقائياً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#222] text-[#888] rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Intro Banner */}
        <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl text-xs space-y-2">
          <div className="font-bold text-[#d4af37] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#d4af37]" />
            <span>معايير التوزيع الذكي للأيام البيداغوجية:</span>
          </div>
          <ul className="text-[#aaa] space-y-1 list-disc list-inside text-[11px] leading-relaxed">
            <li>
              <strong>تنسيق جماعي للمادة:</strong> يجتمع جميع أساتذة المادة الواحدة (مثل اللغة العربية أو الرياضيات) في نفس نصف اليوم لحضور الندوات ومجالس التعليم.
            </li>
            <li>
              <strong>تفريغ مساء الثلاثاء:</strong> يظل مساء الثلاثاء شاغراً لجميع الأساتذة للأنشطة الثقافية والمجالس العامة.
            </li>
            <li>
              <strong>توازن الحضور المدرسي:</strong> توزيع المواد على الأيام (الأحد، الاثنين، الأربعاء، الخميس) لمنع وجود أيام مشلولة بدون أساتذة.
            </li>
            <li>
              <strong>قفل تلقائي:</strong> يتم قفل الفترات البيداغوجية لكل أستاذ تلقائياً لمنع برمجته عن طريق الخطأ.
            </li>
          </ul>
        </div>

        {/* Generate Trigger */}
        {!result && (
          <div className="text-center py-6 space-y-4">
            <button
              onClick={handleRunAiAllocation}
              disabled={loading}
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-[#d4af37] to-[#b8972e] hover:from-[#c59e2e] hover:to-[#a48425] text-black font-bold text-sm rounded-xl shadow-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جارٍ تحليل المواد وتوزيع الأيام البيداغوجية بالذكاء الاصطناعي...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>توليد وتوزيع الأيام البيداغوجية الآن</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-3 bg-[#102410] border border-emerald-500/40 rounded-xl text-xs text-emerald-200">
              <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم التوزيع الذكي بنجاح</span>
              </div>
              <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                {result.explanation}
              </p>
            </div>

            <div className="overflow-x-auto border border-[#222] rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#121212] text-[#d4af37] font-bold border-b border-[#222]">
                  <tr>
                    <th className="p-2.5">المادة التعليمية</th>
                    <th className="p-2.5 text-center">اليوم البيداغوجي المخصص</th>
                    <th className="p-2.5 text-center">الفترة الزمنية</th>
                    <th className="p-2.5 text-center">عدد الأساتذة</th>
                    <th className="p-2.5">الملاحظات والتوجيه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {result.summary.map((item) => {
                    const meta = SUBJECT_METADATA[item.subjectId];
                    return (
                      <tr key={item.subjectId} className="hover:bg-[#141414] transition-colors">
                        <td className="p-2.5 font-bold text-white flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: meta?.defaultColor || '#888' }}
                          />
                          <span>{item.subjectName}</span>
                        </td>
                        <td className="p-2.5 text-center font-bold text-[#d4af37]">
                          <span className="px-2 py-0.5 bg-[#1a120a] border border-[#d4af37]/40 rounded-lg">
                            {item.day}
                          </span>
                        </td>
                        <td className="p-2.5 text-center text-[#ccc]">
                          {item.periodRange === 'morning' ? (
                            <span className="text-amber-300 font-medium">صباحاً (08:00 - 12:00)</span>
                          ) : (
                            <span className="text-blue-300 font-medium">مساءً (13:30 - 17:30)</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-bold text-white">
                          {item.teachersCount} أساتذة
                        </td>
                        <td className="p-2.5 text-[11px] text-[#888]">
                          {item.notes}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleRunAiAllocation}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#161616] hover:bg-[#222] text-[#aaa] rounded-xl text-xs font-bold cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>إعادة التوزيع</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-[#222] hover:bg-[#2c2c2c] text-[#ccc] rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmApply}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black font-bold text-xs rounded-xl shadow-lg cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعتماد وتثبيت الأيام البيداغوجية في النظام</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
