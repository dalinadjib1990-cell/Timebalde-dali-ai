import React, { useState } from 'react';
import {
  FileText,
  Clock,
  BookOpen,
  Award,
  Layers,
  Scale,
  CheckCircle2,
  X,
  Printer,
  ChevronDown,
} from 'lucide-react';
import { GradeLevel, SubjectId } from '../types';
import { SUBJECT_METADATA, OFFICIAL_SUBJECT_RULES } from '../data/officialData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const OfficialLegalSubjectsTableModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [selectedLevel, setSelectedLevel] = useState<GradeLevel | 'all'>('1AM');

  if (!isOpen) return null;

  const levels: { id: GradeLevel; name: string; totalHours: string; bemYear?: boolean }[] = [
    { id: '1AM', name: 'السنة الأولى متوسط (1AM)', totalHours: '28 ساعة و 30 د' },
    { id: '2AM', name: 'السنة الثانية متوسط (2AM)', totalHours: '28 ساعة و 30 د' },
    { id: '3AM', name: 'السنة الثالثة متوسط (3AM)', totalHours: '28 ساعة و 30 د' },
    { id: '4AM', name: 'السنة الرابعة متوسط (4AM - شهادة BEM)', totalHours: '28 ساعة كاملة (بدون أنصاف ساعات)', bemYear: true },
  ];

  // Official table data mapped from the Algerian Middle School Decree
  const legalCurriculumMatrix: {
    subjectId: SubjectId;
    name: string;
    hoursByLevel: Record<GradeLevel, { regular: number; td_tp?: string; coeff: number; split: boolean }>;
    roomType: string;
    legalTeacherQuota: string;
  }[] = [
    {
      subjectId: 'arabic',
      name: 'اللغة العربية وآدابها',
      hoursByLevel: {
        '1AM': { regular: 5, td_tp: '+ 1 سا أ.م (تبادل مع رياضيات)', coeff: 2, split: true },
        '2AM': { regular: 5, td_tp: '+ 1 سا أ.م (تبادل مع رياضيات)', coeff: 3, split: true },
        '3AM': { regular: 5, td_tp: '+ 1 سا أ.م (تبادل مع رياضيات)', coeff: 3, split: true },
        '4AM': { regular: 4, td_tp: '+ 1 سا استدراك/أعمال موجهة (4+1)', coeff: 5, split: true },
      },
      roomType: 'قاعة تدريس عادية',
      legalTeacherQuota: '18 ساعة أسبوعياً',
    },
    {
      subjectId: 'math',
      name: 'الرياضيات',
      hoursByLevel: {
        '1AM': { regular: 4, td_tp: '+ 1 سا أ.م (تبادل مع عربية)', coeff: 2, split: true },
        '2AM': { regular: 4, td_tp: '+ 1 سا أ.م (تبادل مع عربية)', coeff: 3, split: true },
        '3AM': { regular: 4, td_tp: '+ 1 سا أ.م (تبادل مع عربية)', coeff: 3, split: true },
        '4AM': { regular: 4, td_tp: '+ 1 سا استدراك/أعمال موجهة (4+1)', coeff: 4, split: true },
      },
      roomType: 'قاعة تدريس عادية',
      legalTeacherQuota: '18 ساعة أسبوعياً',
    },
    {
      subjectId: 'french',
      name: 'اللغة الفرنسية (مادة أساسية)',
      hoursByLevel: {
        '1AM': { regular: 4, td_tp: '+ 30 د (أ.م)', coeff: 2, split: true },
        '2AM': { regular: 4, td_tp: '+ 30 د (أ.م)', coeff: 3, split: true },
        '3AM': { regular: 4, td_tp: '+ 30 د (أ.م)', coeff: 3, split: true },
        '4AM': { regular: 4, coeff: 3, split: false },
      },
      roomType: 'قاعة تدريس عادية',
      legalTeacherQuota: '18 ساعة أسبوعياً',
    },
    {
      subjectId: 'english',
      name: 'اللغة الإنجليزية',
      hoursByLevel: {
        '1AM': { regular: 3, coeff: 1, split: false },
        '2AM': { regular: 3, coeff: 1, split: false },
        '3AM': { regular: 3, coeff: 1, split: false },
        '4AM': { regular: 2, coeff: 2, split: false },
      },
      roomType: 'قاعة تدريس عادية',
      legalTeacherQuota: '18 ساعة أسبوعياً',
    },
    {
      subjectId: 'science',
      name: 'علوم الطبيعة والحياة',
      hoursByLevel: {
        '1AM': { regular: 2, td_tp: '+ 30 د (أ.ت)', coeff: 2, split: true },
        '2AM': { regular: 2, td_tp: '+ 30 د (أ.ت)', coeff: 2, split: true },
        '3AM': { regular: 2, td_tp: '+ 30 د (أ.ت)', coeff: 2, split: true },
        '4AM': { regular: 2, td_tp: '1 سا قسم + 1 سا مخبر TP', coeff: 2, split: true },
      },
      roomType: 'مخبر علوم الطبيعة والحياة',
      legalTeacherQuota: '18 ساعة أسبوعياً',
    },
    {
      subjectId: 'physics',
      name: 'العلوم الفيزيائية والتكنولوجيا',
      hoursByLevel: {
        '1AM': { regular: 2, td_tp: '+ 30 د (أ.ت)', coeff: 2, split: true },
        '2AM': { regular: 2, td_tp: '+ 30 د (أ.ت)', coeff: 2, split: true },
        '3AM': { regular: 2, td_tp: '+ 30 د (أ.ت)', coeff: 2, split: true },
        '4AM': { regular: 2, td_tp: '1 سا قسم + 1 سا مخبر TP', coeff: 2, split: true },
      },
      roomType: 'مخبر العلوم الفيزيائية والتكنولوجيا',
      legalTeacherQuota: '18 ساعة أسبوعياً',
    },
    {
      subjectId: 'history',
      name: 'التاريخ والجغرافيا',
      hoursByLevel: {
        '1AM': { regular: 3, coeff: 2, split: false },
        '2AM': { regular: 3, coeff: 2, split: false },
        '3AM': { regular: 3, coeff: 2, split: false },
        '4AM': { regular: 3, coeff: 3, split: false },
      },
      roomType: 'قاعة تدريس عادية',
      legalTeacherQuota: '18 ساعة أسبوعياً',
    },
    {
      subjectId: 'islamic',
      name: 'التربية الإسلامية',
      hoursByLevel: {
        '1AM': { regular: 1, coeff: 1, split: false },
        '2AM': { regular: 1, coeff: 1, split: false },
        '3AM': { regular: 1, coeff: 1, split: false },
        '4AM': { regular: 1, coeff: 2, split: false },
      },
      roomType: 'قاعة تدريس عادية',
      legalTeacherQuota: '18 ساعة أسبوعياً',
    },
    {
      subjectId: 'civic',
      name: 'التربية المدنية',
      hoursByLevel: {
        '1AM': { regular: 1, coeff: 1, split: false },
        '2AM': { regular: 1, coeff: 1, split: false },
        '3AM': { regular: 1, coeff: 1, split: false },
        '4AM': { regular: 1, coeff: 1, split: false },
      },
      roomType: 'قاعة تدريس عادية',
      legalTeacherQuota: '18 ساعة أسبوعياً',
    },
    {
      subjectId: 'pe',
      name: 'التربية البدنية والرياضية',
      hoursByLevel: {
        '1AM': { regular: 2, coeff: 1, split: false },
        '2AM': { regular: 2, coeff: 1, split: false },
        '3AM': { regular: 2, coeff: 1, split: false },
        '4AM': { regular: 2, coeff: 1, split: false },
      },
      roomType: 'ميدان / فناء التربية البدنية',
      legalTeacherQuota: '18 ساعة أسبوعياً',
    },
    {
      subjectId: 'art_music',
      name: 'التربية التشكيلية والتربية الموسيقية',
      hoursByLevel: {
        '1AM': { regular: 1, coeff: 1, split: false },
        '2AM': { regular: 1, coeff: 1, split: false },
        '3AM': { regular: 1, coeff: 1, split: false },
        '4AM': { regular: 1, coeff: 1, split: false },
      },
      roomType: 'ورشة التربية الفنية والموسيقية',
      legalTeacherQuota: '18 ساعة أسبوعياً',
    },
    {
      subjectId: 'computer',
      name: 'المعلوماتية (الإعلام الآلي)',
      hoursByLevel: {
        '1AM': { regular: 1, td_tp: '(أ.ت تفويج)', coeff: 1, split: true },
        '2AM': { regular: 1, td_tp: '(أ.ت تفويج)', coeff: 1, split: true },
        '3AM': { regular: 1, td_tp: '(أ.ت تفويج)', coeff: 1, split: true },
        '4AM': { regular: 1, td_tp: '(أ.ت تفويج)', coeff: 1, split: true },
      },
      roomType: 'قاعة الإعلام الآلي',
      legalTeacherQuota: '18 ساعة أسبوعياً',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#0c0c0c] border border-[#d4af37]/40 rounded-2xl max-w-5xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1a120a] border border-[#d4af37]/50 flex items-center justify-center text-[#d4af37]">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-[#888] font-bold">
                الجمهورية الجزائرية الديمقراطية الشعبية — وزارة التربية الوطنية
              </div>
              <h3 className="font-bold text-white text-base md:text-lg flex items-center gap-2 mt-0.5">
                <span>جدول الحصص والأنصبة القانونية المعتمدة لكل مادة ومستوى</span>
                <span className="text-xs bg-[#1a120a] text-[#d4af37] px-2.5 py-0.5 rounded-full border border-[#d4af37]/40 font-bold">
                  2026 / 2027
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#222] text-[#888] rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111] p-2 rounded-xl border border-[#222]">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {levels.map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedLevel === lvl.id
                    ? 'bg-[#d4af37] text-black shadow-md'
                    : 'bg-[#181818] text-[#888] hover:text-white hover:bg-[#222]'
                }`}
              >
                {lvl.name}
              </button>
            ))}
          </div>

          <div className="text-xs text-[#aaa] font-medium flex items-center gap-3">
            <span>
              الحجم الساعي الأسبوعي للقسم:{' '}
              <strong className="text-[#d4af37]">
                {selectedLevel === '4AM' ? '28 ساعة كاملة (نظام 4+1 بدون أنصاف ساعات)' : '28 ساعة و 30 دقيقة'}
              </strong>
            </span>
            <span>•</span>
            <span>
              النصاب القانوني للأستاذ: <strong className="text-white">18 ساعة تدريس أسبوعياً</strong>
            </span>
            {selectedLevel === '4AM' && (
              <>
                <span>•</span>
                <span className="px-2 py-0.5 bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 rounded-full font-bold">
                  شهادة BEM: عربية 4+1 | رياضيات 4+1 | فرنسية 4 سا
                </span>
              </>
            )}
          </div>
        </div>

        {/* Main Official Legal Table */}
        <div className="overflow-x-auto border border-[#222] rounded-xl shadow-lg">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#121212] text-[#d4af37] font-bold border-b border-[#222]">
              <tr>
                <th className="p-3 w-48">المادة التعليمية</th>
                <th className="p-3 text-center">الحجم الساعي الأسبوعي القانوني</th>
                <th className="p-3 text-center">الأعمال الموجهة / التطبيقية (TD/TP)</th>
                <th className="p-3 text-center">المعامل الرسمي</th>
                <th className="p-3">الهيكل والقاعة المطلوبة</th>
                <th className="p-3 text-center">النصاب القانوني للأستاذ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {legalCurriculumMatrix.map((item) => {
                const meta = SUBJECT_METADATA[item.subjectId];
                const activeLevel = selectedLevel === 'all' ? '1AM' : selectedLevel;
                const levelData = item.hoursByLevel[activeLevel];

                return (
                  <tr key={item.subjectId} className="hover:bg-[#141414] transition-colors">
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: meta?.defaultColor || '#d4af37' }}
                      />
                      <span>{item.name}</span>
                    </td>

                    <td className="p-3 text-center font-bold text-sm text-[#d4af37]">
                      {levelData.regular} ساعات
                    </td>

                    <td className="p-3 text-center">
                      {levelData.td_tp ? (
                        <span className="px-2 py-0.5 bg-amber-950/40 text-amber-300 border border-amber-500/40 rounded-lg font-bold text-[11px]">
                          {levelData.td_tp} (فوج مصغر)
                        </span>
                      ) : (
                        <span className="text-[#555] text-[11px]">—</span>
                      )}
                    </td>

                    <td className="p-3 text-center font-bold text-white">
                      <span className="px-2.5 py-0.5 bg-[#181818] border border-[#333] rounded-md">
                        {levelData.coeff}
                      </span>
                    </td>

                    <td className="p-3 text-[#aaa]">
                      <span className="text-[11px] font-medium">{item.roomType}</span>
                    </td>

                    <td className="p-3 text-center font-bold text-emerald-400">
                      <span className="text-[11px] px-2 py-0.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg">
                        {item.legalTeacherQuota}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#111] border-t border-[#333] font-bold text-xs">
              <tr>
                <td className="p-3 text-white">المجموع الإجمالي للقسم الأسبوعي</td>
                <td className="p-3 text-center text-[#d4af37] text-sm">
                  {selectedLevel === '4AM' ? '28 ساعة كاملة' : '28 ساعة و 30 دقيقة'}
                </td>
                <td className="p-3 text-center text-amber-300">
                  {selectedLevel === '4AM' ? 'حصص استدراك 4+1 ومخابر TP كاملة' : '4 حصص تفويج (TD/TP)'}
                </td>
                <td className="p-3 text-center text-white">
                  {selectedLevel === '4AM' ? 'المعامل الإجمالي BEM: 25' : 'المعامل الإجمالي: 18 - 25'}
                </td>
                <td className="p-3 text-[#aaa]">توزيع كامل على أيام الأسبوع الـ 5</td>
                <td className="p-3 text-center text-emerald-400">نصاب الأستاذ: 18 سا</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legal Notes Footer */}
        <div className="p-4 bg-[#111] border border-[#222] rounded-xl text-xs space-y-2">
          <div className="font-bold text-[#d4af37] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>تنبيهات قانونية وتنظيمية هامة للمدير عند ملء الجداول يدوياً:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-[#aaa]">
            <div>• لا يجوز برمجـة أكثر من ساعتين متتاليتين لنفس المادة باستثناء حصص التربية البدنية.</div>
            <div>• الفترات الصباحية (الفترات 1 و 2 و 3) تُعطى أولوية للمواد المعرفية الأساسية (العربية، الرياضيات، الفرنسية).</div>
            <div>• مساء الثلاثاء مخصص للندوات والأنشطة الثقافية والتكوين المستمر لجميع الأساتذة.</div>
            <div>• يلتزم الأستاذ بنصابه القانوني (18 ساعة للتعليم المتوسط)، وأي زيادة تسجل كساعات إضافية رسمية.</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black font-bold text-xs rounded-xl shadow-lg cursor-pointer"
          >
            فهمت، العودة إلى استعمال الزمن
          </button>
        </div>
      </div>
    </div>
  );
};
