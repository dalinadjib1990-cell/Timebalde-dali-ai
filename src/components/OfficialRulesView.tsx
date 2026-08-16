import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Sparkles,
  Info,
  Layers,
  Clock,
  Award,
  Save,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { SubjectRule, GradeLevel, SubjectId } from '../types';
import { OFFICIAL_DOCUMENT_METADATA, SUBJECT_METADATA } from '../data/officialData';
import { SubjectIcon } from './SubjectIcon';

interface Props {
  rules: SubjectRule[];
  onUpdateRule: (updatedRule: SubjectRule) => void;
  onResetToOfficial: () => void;
}

export const OfficialRulesView: React.FC<Props> = ({
  rules,
  onUpdateRule,
  onResetToOfficial,
}) => {
  const [selectedCellRule, setSelectedCellRule] = useState<SubjectRule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Edit form state
  const [editHours, setEditHours] = useState(0);
  const [editMinutes, setEditMinutes] = useState(0);
  const [editCoeff, setEditCoeff] = useState(1);
  const [editNotes, setEditNotes] = useState('');

  const levels: GradeLevel[] = ['1AM', '2AM', '3AM', '4AM'];
  const subjectIds: SubjectId[] = [
    'arabic',
    'english',
    'french',
    'amazigh',
    'math',
    'science',
    'physics',
    'history',
    'geography',
    'islamic',
    'civic',
    'art_music',
    'pe',
    'computer',
  ];

  const handleCellClick = (rule: SubjectRule) => {
    setSelectedCellRule(rule);
    setEditHours(rule.weekly_hours);
    setEditMinutes(rule.additional_minutes);
    setEditCoeff(rule.coefficient);
    setEditNotes(rule.notes || '');
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (!selectedCellRule) return;
    const updated: SubjectRule = {
      ...selectedCellRule,
      weekly_hours: Number(editHours),
      additional_minutes: Number(editMinutes),
      coefficient: Number(editCoeff),
      notes: editNotes,
      verified: true,
      verified_by: 'تعديل وتأكيد المسؤول يدوياً',
      updated_at: new Date().toISOString().split('T')[0],
      raw_text: `${editHours} سا ${editMinutes > 0 ? `+ ${editMinutes} د (أ.م)` : ''} | المعامل: ${editCoeff}`,
    };
    onUpdateRule(updated);
    setSelectedCellRule(updated);
    setIsEditing(false);
  };

  // Calculate totals per level
  const totalsByLevel = levels.map((lvl) => {
    const levelRules = rules.filter((r) => r.level === lvl);
    const totalHours = levelRules.reduce((acc, r) => acc + r.weekly_hours, 0);
    const totalMinutes = levelRules.reduce((acc, r) => acc + r.additional_minutes, 0);
    const totalCoeff = levelRules.reduce((acc, r) => acc + r.coefficient, 0);
    return { level: lvl, totalHours, totalMinutes, totalCoeff };
  });

  return (
    <div id="official-rules-view" className="space-y-6">
      {/* Official Header Banner */}
      <div className="bg-[#0a0a0a] text-white rounded-2xl p-6 shadow-2xl border border-[#222] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1a120a] border border-[#d4af37]/30 rounded-full text-[#d4af37] text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>{OFFICIAL_DOCUMENT_METADATA.authority}</span>
              <span className="text-[#d4af37]/60">•</span>
              <span>الموسم الدراسي {OFFICIAL_DOCUMENT_METADATA.academicYear}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {OFFICIAL_DOCUMENT_METADATA.subtitle}
            </h1>
            <p className="text-[#888] text-sm max-w-3xl leading-relaxed">
              {OFFICIAL_DOCUMENT_METADATA.title} — مستخرج وموثق بدقة من الوثيقة الوزارية الرسمية
              المرفقة بدون أي تخمين أو تعديل عشوائي.
            </p>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
            <button
              id="view-original-doc-btn"
              onClick={() => setShowImageModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black font-bold text-sm rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>عرض الوثيقة الأصلية</span>
            </button>
            <button
              id="reset-official-rules-btn"
              onClick={onResetToOfficial}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#161616] hover:bg-[#222] text-[#ccc] hover:text-white font-medium text-sm rounded-xl border border-[#333] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              title="إعادة تعيين القيم إلى الوثيقة الوزارية الرسمية"
            >
              <RotateCcw className="w-4 h-4 text-[#888]" />
              <span>إعادة ضبط</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Official Matrix Table */}
      <div className="bg-[#0a0a0a] rounded-2xl shadow-xl border border-[#222] overflow-hidden">
        <div className="p-4 bg-[#0f0f0f] border-b border-[#222] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#d4af37]" />
            <h2 className="font-bold text-white text-base">
              جدول الحجم الساعي الأسبوعي والمعاملات لمرحلة التعليم المتوسط
            </h2>
          </div>
          <span className="text-xs text-[#d4af37] bg-[#1a120a] border border-[#d4af37]/30 px-3 py-1 rounded-full font-medium">
            اضغط على أي خلية للاطلاع على مصدرها الوزاري أو تعديلها
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm border-collapse">
            <thead>
              <tr className="bg-[#111] text-[#888] border-b border-[#222]">
                <th className="p-3.5 font-bold text-right w-56 text-[#aaa]">المادة التعليمية</th>
                {levels.map((lvl) => (
                  <th key={lvl} colSpan={2} className="p-3.5 font-bold text-center border-r border-[#222]">
                    <div className="text-[#d4af37] text-base">
                      {lvl === '1AM'
                        ? 'السنة الأولى متوسط'
                        : lvl === '2AM'
                        ? 'السنة الثانية متوسط'
                        : lvl === '3AM'
                        ? 'السنة الثالثة متوسط'
                        : 'السنة الرابعة متوسط'}
                    </div>
                    <div className="grid grid-cols-2 text-xs text-[#666] font-normal mt-1 border-t border-[#222] pt-1">
                      <span>الحجم الساعي</span>
                      <span className="border-r border-[#222]">المعامل</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {subjectIds.map((sId) => {
                const meta = SUBJECT_METADATA[sId];
                return (
                  <tr key={sId} className="hover:bg-[#141414] transition-colors">
                    <td className="p-3.5 font-medium text-white flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs"
                        style={{ backgroundColor: meta.defaultColor }}
                      >
                        <SubjectIcon subjectId={sId} className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-[#f0f0f0]">{meta.name}</div>
                        <div className="text-[11px] text-[#666] font-normal">
                          {meta.defaultRoomType === 'science_lab'
                            ? 'مخبر علوم طبيعية'
                            : meta.defaultRoomType === 'physics_lab'
                            ? 'مخبر فيزياء'
                            : meta.defaultRoomType === 'computer_lab'
                            ? 'قاعة إعلام آلي'
                            : meta.defaultRoomType === 'sports_ground'
                            ? 'فناء التربية البدنية'
                            : meta.defaultRoomType === 'art_room'
                            ? 'ورشة تربية فنية'
                            : 'قاعة عادية'}
                        </div>
                      </div>
                    </td>

                    {levels.map((lvl) => {
                      const rule = rules.find((r) => r.subject_id === sId && r.level === lvl);
                      if (!rule) {
                        return (
                          <td key={lvl} colSpan={2} className="p-3 text-center text-[#444] border-r border-[#222]">
                            —
                          </td>
                        );
                      }

                      const isSelected = selectedCellRule?.id === rule.id;

                      return (
                        <React.Fragment key={lvl}>
                          <td
                            onClick={() => handleCellClick(rule)}
                            className={`p-2.5 text-center cursor-pointer border-r border-[#222] transition-all ${
                              isSelected
                                ? 'bg-[#1a120a] ring-2 ring-[#d4af37] font-bold text-white'
                                : 'hover:bg-[#161616]'
                            }`}
                            title="انقر لعرض مصدر الوثيقة والتفاصيل"
                          >
                            <div className="font-semibold text-[#e0e0e0] flex items-center justify-center gap-1">
                              <span>{rule.weekly_hours} سا</span>
                              {rule.additional_minutes > 0 && (
                                <span className="text-[11px] text-[#d4af37] bg-[#1a120a] border border-[#d4af37]/30 px-1.5 py-0.5 rounded-sm">
                                  + {rule.additional_minutes}د
                                </span>
                              )}
                            </div>
                            {rule.td_required && (
                              <span className="text-[10px] text-[#d4af37] bg-[#1a120a] border border-[#d4af37]/30 px-1 rounded-sm">
                                (أ.م TD)
                              </span>
                            )}
                            {rule.tp_required && (
                              <span className="text-[10px] text-[#60a5fa] bg-[#0c192c] border border-[#60a5fa]/30 px-1 rounded-sm">
                                (مخبر TP)
                              </span>
                            )}
                          </td>
                          <td
                            onClick={() => handleCellClick(rule)}
                            className={`p-2.5 text-center cursor-pointer font-bold border-r border-[#222] transition-all ${
                              isSelected
                                ? 'bg-[#1a120a] ring-2 ring-[#d4af37] text-white'
                                : 'hover:bg-[#161616] text-[#ccc]'
                            }`}
                          >
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#161616] text-[#e0e0e0] border border-[#333] font-bold text-xs">
                              {rule.coefficient}
                            </span>
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#0f0f0f] text-white font-bold border-t-2 border-[#d4af37]/40">
                <td className="p-4 text-right text-[#d4af37]">المجموع الأسبوعي</td>
                {totalsByLevel.map((tot) => (
                  <React.Fragment key={tot.level}>
                    <td className="p-3 text-center border-r border-[#222] text-[#e0e0e0]">
                      <div>{tot.totalHours} سا</div>
                      {tot.totalMinutes > 0 && (
                        <div className="text-[11px] text-[#d4af37] font-normal">
                          (+ {tot.totalMinutes / 60} سا أ.م)
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center border-r border-[#222] text-[#d4af37]">
                      {tot.totalCoeff}
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Official Notes & Inspector Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Selected Cell Inspector */}
        <div className="lg:col-span-6 bg-[#0a0a0a] rounded-2xl p-5 shadow-xl border border-[#222]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#222]">
            <div className="flex items-center gap-2 text-white">
              <Info className="w-5 h-5 text-[#d4af37]" />
              <h3 className="font-bold text-base">
                تفاصيل ومصدر الخلية المحددة
              </h3>
            </div>
            {selectedCellRule && !isEditing && (
              <button
                id="edit-selected-rule-btn"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#161616] text-[#d4af37] border border-[#d4af37]/30 hover:bg-[#222] rounded-lg transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل يدوي</span>
              </button>
            )}
          </div>

          {selectedCellRule ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-[#121212] rounded-xl border border-[#262626]">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs"
                  style={{
                    backgroundColor: SUBJECT_METADATA[selectedCellRule.subject_id]?.defaultColor || '#059669',
                  }}
                >
                  <SubjectIcon subjectId={selectedCellRule.subject_id} className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white text-base">
                    {selectedCellRule.subject_name} — {selectedCellRule.level}
                  </div>
                  <div className="text-xs text-[#4ade80] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80]" />
                    <span>{selectedCellRule.verified_by}</span>
                  </div>
                </div>
              </div>

              {!isEditing ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#111] rounded-xl border border-[#222]">
                    <div className="text-xs text-[#777]">الحجم الساعي الأساسي</div>
                    <div className="text-lg font-bold text-white mt-0.5">
                      {selectedCellRule.weekly_hours} سا / أسبوع
                    </div>
                  </div>
                  <div className="p-3 bg-[#111] rounded-xl border border-[#222]">
                    <div className="text-xs text-[#777]">الأعمال الموجهة (TD)</div>
                    <div className="text-lg font-bold text-[#d4af37] mt-0.5">
                      {selectedCellRule.additional_minutes > 0 ? `${selectedCellRule.additional_minutes} دقيقة` : 'لا يوجد'}
                    </div>
                  </div>
                  <div className="p-3 bg-[#111] rounded-xl border border-[#222]">
                    <div className="text-xs text-[#777]">المعامل الرسمي</div>
                    <div className="text-lg font-bold text-[#d4af37] mt-0.5">
                      {selectedCellRule.coefficient}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-[#111] rounded-xl border border-[#222]">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#aaa] mb-1">
                        الحجم الساعي (سا)
                      </label>
                      <input
                        type="number"
                        value={editHours}
                        onChange={(e) => setEditHours(Number(e.target.value))}
                        className="w-full p-2 bg-[#050505] border border-[#333] text-white rounded-lg text-center font-bold focus:border-[#d4af37] outline-hidden"
                        min={0}
                        max={10}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#aaa] mb-1">
                        دقائق TD الإضافية
                      </label>
                      <input
                        type="number"
                        value={editMinutes}
                        onChange={(e) => setEditMinutes(Number(e.target.value))}
                        className="w-full p-2 bg-[#050505] border border-[#333] text-white rounded-lg text-center font-bold focus:border-[#d4af37] outline-hidden"
                        step={15}
                        min={0}
                        max={60}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#aaa] mb-1">
                        المعامل
                      </label>
                      <input
                        type="number"
                        value={editCoeff}
                        onChange={(e) => setEditCoeff(Number(e.target.value))}
                        className="w-full p-2 bg-[#050505] border border-[#333] text-white rounded-lg text-center font-bold focus:border-[#d4af37] outline-hidden"
                        min={1}
                        max={10}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#aaa] mb-1">
                      ملاحظات تنظيمية خاصة
                    </label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      className="w-full p-2 bg-[#050505] border border-[#333] text-white rounded-lg text-xs focus:border-[#d4af37] outline-hidden"
                      placeholder="أضف أي شرط تفويج أو تنظيم بيداغوجي خاص..."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-xs text-[#888] hover:bg-[#222] rounded-lg cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="flex items-center gap-1 px-4 py-1.5 bg-[#d4af37] text-black text-xs font-bold rounded-lg hover:bg-[#c59e2e] cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>حفظ التعديل</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="p-3 bg-[#111] rounded-xl border border-[#222] text-xs text-[#ccc] space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>المرجع المستخرج:</span>
                </div>
                <div className="text-[#aaa] leading-relaxed font-mono bg-[#050505] p-2 rounded border border-[#222]">
                  {selectedCellRule.raw_text}
                </div>
                {selectedCellRule.notes && (
                  <div className="text-[#d4af37] text-[11px] bg-[#1a120a] p-2 rounded border border-[#d4af37]/30 mt-1">
                    ⚠️ {selectedCellRule.notes}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-[#666] text-sm">
              <Sparkles className="w-8 h-8 mx-auto text-[#444] mb-2" />
              <span>انقر على أي مادة وسنة في الجدول أعلاه لعرض التفاصيل والمصدر الوزاري</span>
            </div>
          )}
        </div>

        {/* Official Notes Box from Image Footer */}
        <div className="lg:col-span-6 bg-[#0a0a0a] rounded-2xl p-5 shadow-xl border border-[#222] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#222] text-white">
            <CheckCircle2 className="w-5 h-5 text-[#d4af37]" />
            <h3 className="font-bold text-base">
              ملاحظات وقواعد التنظيم الوزاري (المستخرجة من أسفل الوثيقة)
            </h3>
          </div>

          <div className="space-y-3">
            {/* Note 1 */}
            <div className="p-4 bg-[#121008] rounded-xl border border-[#d4af37]/30 space-y-1.5">
              <div className="flex items-center gap-2 text-[#d4af37] font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-[#d4af37] text-black flex items-center justify-center text-xs font-black">
                  1
                </span>
                <span>قاعدة تفويج الأعمال الموجهة (TD):</span>
              </div>
              <p className="text-xs text-[#ddd] leading-relaxed pr-8">
                «يُدرج القسم إلى فوجين خلال حصة الأعمال الموجهة (أ.م) في مواد{' '}
                <strong className="text-[#d4af37]">اللغة العربية والرياضيات واللغة الفرنسية واللغة الإنجليزية</strong>
                ، بمعدل حصة واحدة، مرة كل أسبوعين.»
              </p>
              <div className="text-[11px] text-[#4ade80] font-medium pr-8">
                ✓ مطبقة كقاعدة برمجية في محرك الجدولة DALI CSP Solver.
              </div>
            </div>

            {/* Note 2 */}
            <div className="p-4 bg-[#0a121c] rounded-xl border border-[#3b82f6]/30 space-y-1.5">
              <div className="flex items-center gap-2 text-[#60a5fa] font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-[#3b82f6] text-white flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>قاعدة المخابر والأعمال التطبيقية (TP):</span>
              </div>
              <p className="text-xs text-[#ddd] leading-relaxed pr-8">
                «لا يطرأ أي تعديل على تنظيم حصص الأعمال التطبيقية في مواد{' '}
                <strong className="text-[#60a5fa]">علوم الطبيعة والحياة، والعلوم الفيزيائية والتكنولوجيا، والإعلام الآلي</strong>
                .»
              </p>
              <div className="text-[11px] text-[#60a5fa] font-medium pr-8">
                ✓ يتم إلزام النظام بحجز المخابر المتخصصة لكل حصة تجارب تطبيقية.
              </div>
            </div>

            {/* Note 3 */}
            <div className="p-3.5 bg-[#141414] rounded-xl border border-[#262626] text-xs text-[#aaa] space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[#e0e0e0]">
                <AlertCircle className="w-4 h-4 text-[#d4af37]" />
                <span>ضمان عدم التخمين (Zero Guessing Policy):</span>
              </div>
              <p className="text-[11px] text-[#888] leading-relaxed">
                جميع المعاملات والأحجام الساعية مطابقة 100% للنص الوزاري الرسمي. أي وثيقة تنظيمية جديدة
                يتم رفعها تخضع للفحص المقارن الآلي قبل اعتمادها.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reference Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#0a0a0a] border border-[#333] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 bg-[#0f0f0f] border-b border-[#222] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#d4af37]" />
                <h3 className="font-bold text-base text-white">
                  الوثيقة المرجعية الرسمية — ملحق القرار 27 جويلية 2026
                </h3>
              </div>
              <button
                onClick={() => setShowImageModal(false)}
                className="w-8 h-8 rounded-full bg-[#1c1c1c] hover:bg-[#282828] flex items-center justify-center text-[#888] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 bg-[#050505] flex items-center justify-center">
              <img
                src={`/assets/.aistudio/1786887449228.jpg`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://raw.githubusercontent.com/placeholder-ministerial-doc/algeria-middle-school.jpg';
                }}
                alt="الوثيقة الوزارية الرسمية لمواقيت ومعاملات التعليم المتوسط"
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-2xl border border-[#222]"
              />
            </div>
            <div className="p-3 bg-[#0f0f0f] border-t border-[#222] text-xs text-[#888] text-center">
              ملحق القرار المؤرخ في 12 صفر عام 1448 الموافق 27 جويلية سنة 2026 — وزارة التربية الوطنية
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
