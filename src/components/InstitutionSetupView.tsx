import React, { useState } from 'react';
import {
  Building2,
  GraduationCap,
  Users,
  Clock,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sliders,
  Calendar,
  Layers,
} from 'lucide-react';
import { InstitutionConfig, SchoolClass, GradeLevel, SubjectId } from '../types';
import { getPeriodsForShift } from '../data/defaultSchool';
import { SUBJECT_METADATA } from '../data/officialData';

interface Props {
  config: InstitutionConfig;
  classes: SchoolClass[];
  onSaveConfig: (updatedConfig: InstitutionConfig) => void;
  onUpdateClasses: (updatedClasses: SchoolClass[]) => void;
  onGenerateTimetable: () => void;
}

export const InstitutionSetupView: React.FC<Props> = ({
  config,
  classes,
  onSaveConfig,
  onUpdateClasses,
  onGenerateTimetable,
}) => {
  // Local form state
  const [name, setName] = useState(config.name);
  const [directorName, setDirectorName] = useState(config.directorName);
  const [academicYear, setAcademicYear] = useState(config.academicYear);
  const [educationDirectorate, setEducationDirectorate] = useState(config.educationDirectorate);
  const [commune, setCommune] = useState(config.commune);

  // Shifts and Annex
  const [afternoonShiftMode, setAfternoonShiftMode] = useState(config.afternoonShiftMode || 'standard');
  const [hasAnnex, setHasAnnex] = useState(config.hasAnnex ?? true);
  const [annexName, setAnnexName] = useState(config.annexName || 'ملحقة متوسطة 3 أقسام (2AM)');
  const [remedialDay, setRemedialDay] = useState(config.remedialDay || 'الأربعاء');
  const [remedialPeriod, setRemedialPeriod] = useState(config.remedialPeriod || 7);
  const [tuesdayAfternoonOff, setTuesdayAfternoonOff] = useState(config.tuesdayAfternoonOff);

  // Subject Pedagogical Days
  const [subjectPedDays, setSubjectPedDays] = useState(
    config.subjectPedagogicalDays || {
      arabic: { day: 'الثلاثاء', periodRange: 'afternoon' },
      french: { day: 'الثلاثاء', periodRange: 'afternoon' },
      english: { day: 'الاثنين', periodRange: 'afternoon' },
      math: { day: 'الأربعاء', periodRange: 'afternoon' },
      science: { day: 'الخميس', periodRange: 'morning' },
      physics: { day: 'الخميس', periodRange: 'afternoon' },
      history: { day: 'الأحد', periodRange: 'afternoon' },
      geography: { day: 'الأحد', periodRange: 'afternoon' },
      islamic: { day: 'الاثنين', periodRange: 'morning' },
      civic: { day: 'الاثنين', periodRange: 'afternoon' },
      pe: { day: 'الثلاثاء', periodRange: 'afternoon' },
      art_music: { day: 'الأربعاء', periodRange: 'morning' },
      amazigh: { day: 'الخميس', periodRange: 'morning' },
      computer: { day: 'الأحد', periodRange: 'morning' },
    }
  );

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Handle Save
  const handleSave = () => {
    const newPeriods = getPeriodsForShift(afternoonShiftMode);

    const updatedConfig: InstitutionConfig = {
      ...config,
      name,
      directorName,
      academicYear,
      educationDirectorate,
      commune,
      afternoonShiftMode,
      hasAnnex,
      annexName,
      remedialDay,
      remedialPeriod: Number(remedialPeriod),
      tuesdayAfternoonOff,
      subjectPedagogicalDays: subjectPedDays,
      periods: newPeriods,
    };

    onSaveConfig(updatedConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const daysList = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

  // Count classes per level
  const count1AM = classes.filter((c) => c.level === '1AM').length;
  const count2AM = classes.filter((c) => c.level === '2AM').length;
  const count3AM = classes.filter((c) => c.level === '3AM').length;
  const count4AM = classes.filter((c) => c.level === '4AM').length;
  const annexClassesCount = classes.filter((c) => c.isAnnex).length;

  return (
    <div id="institution-setup-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-[#0a0a0a] via-[#121212] to-[#1a1508] rounded-2xl p-6 border border-[#2d2a1d] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-[#d4af37] to-[#8a701e] flex items-center justify-center text-black font-black shadow-lg">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30">
                  إعدادات الهيكل والتوقيت المؤسساتي
                </span>
                <span className="text-xs text-[#888]">الجمهورية الجزائرية الديمقراطية الشعبية</span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                بيانات المؤسسة، الملحقة ونظام الدوام
              </h2>
              <p className="text-xs text-[#aaa] max-w-2xl mt-1">
                ضبط معلومات المتوسطة، دوام الظهيرة (13:00 أو 13:30 أو 14:00)، تفعيل وإدارة الملحقة (أقسام 2AM)، أيام التنسيق البيداغوجي وحصص الاستدراك.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {savedSuccess && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-500/40">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم حفظ الإعدادات وتحديث الجداول!</span>
              </span>
            )}
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black font-black rounded-xl text-xs shadow-lg transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </button>
            <button
              onClick={onGenerateTimetable}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] hover:bg-[#252525] text-white font-bold rounded-xl text-xs border border-[#333] shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#d4af37]" />
              <span>توليد جدول جديد وفق الإعدادات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: School Identity Info */}
        <div className="bg-[#0a0a0a] rounded-2xl border border-[#222] p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[#222] pb-3">
            <Building2 className="w-5 h-5 text-[#d4af37]" />
            <h3 className="text-base font-bold text-white">الهوية الرسمية للمتوسطة</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[#aaa] font-bold mb-1">اسم المؤسسة التعليمية:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-[#141414] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                placeholder="متوسطة الشهيد البشير الإبراهيمي..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#aaa] font-bold mb-1">مدير المؤسسة:</label>
                <input
                  type="text"
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                  className="w-full p-2.5 bg-[#141414] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                />
              </div>
              <div>
                <label className="block text-[#aaa] font-bold mb-1">الموسم الدراسي:</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full p-2.5 bg-[#141414] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#aaa] font-bold mb-1">مديرية التربية:</label>
                <input
                  type="text"
                  value={educationDirectorate}
                  onChange={(e) => setEducationDirectorate(e.target.value)}
                  className="w-full p-2.5 bg-[#141414] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                />
              </div>
              <div>
                <label className="block text-[#aaa] font-bold mb-1">البلدية / الدائرة:</label>
                <input
                  type="text"
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  className="w-full p-2.5 bg-[#141414] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Afternoon Shift Mode & Tuesday Afternoon */}
        <div className="bg-[#0a0a0a] rounded-2xl border border-[#222] p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[#222] pb-3">
            <Clock className="w-5 h-5 text-[#d4af37]" />
            <h3 className="text-base font-bold text-white">نظام الدوام المسائي والتوقيت</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-[#aaa] font-bold mb-2">اختر نظام دوام الظهيرة المعتمد بالمؤسسة:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAfternoonShiftMode('standard')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    afternoonShiftMode === 'standard'
                      ? 'bg-[#1a120a] border-[#d4af37] text-white shadow-md'
                      : 'bg-[#141414] border-[#222] text-[#888] hover:border-[#444]'
                  }`}
                >
                  <div className="font-bold text-xs text-[#d4af37]">دوام قياسي</div>
                  <div className="text-[11px] font-mono mt-1">13:30 - 17:30</div>
                  <div className="text-[10px] text-[#777] mt-0.5">استراحة الغداء: 11:30 - 13:30</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAfternoonShiftMode('early_13h')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    afternoonShiftMode === 'early_13h'
                      ? 'bg-[#1a120a] border-[#d4af37] text-white shadow-md'
                      : 'bg-[#141414] border-[#222] text-[#888] hover:border-[#444]'
                  }`}
                >
                  <div className="font-bold text-xs text-[#d4af37]">دوام مبكر (13:00)</div>
                  <div className="text-[11px] font-mono mt-1">13:00 - 17:00</div>
                  <div className="text-[10px] text-[#777] mt-0.5">مناسب للمناطق النائية والنقل</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAfternoonShiftMode('late_14h')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    afternoonShiftMode === 'late_14h'
                      ? 'bg-[#1a120a] border-[#d4af37] text-white shadow-md'
                      : 'bg-[#141414] border-[#222] text-[#888] hover:border-[#444]'
                  }`}
                >
                  <div className="font-bold text-xs text-[#d4af37]">دوام متأخر (14:00)</div>
                  <div className="text-[11px] font-mono mt-1">14:00 - 18:00</div>
                  <div className="text-[10px] text-[#777] mt-0.5">استراحة غداء ممتدة (ساعتان ونصف)</div>
                </button>
              </div>
            </div>

            {/* Tuesday afternoon checkbox */}
            <div className="p-3 bg-[#141414] rounded-xl border border-[#222] flex items-center justify-between">
              <div>
                <div className="font-bold text-white">تفريغ مساء الثلاثاء للندوات والأنشطة الثقافية</div>
                <div className="text-[11px] text-[#888]">
                  تطبيق المنشور الوزاري: لا تبرمج حصص لتلاميذ المتوسط بعد 12:00 زوالاً يوم الثلاثاء
                </div>
              </div>
              <input
                type="checkbox"
                checked={tuesdayAfternoonOff}
                onChange={(e) => setTuesdayAfternoonOff(e.target.checked)}
                className="w-5 h-5 accent-[#d4af37] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Annex Configuration */}
        <div className="bg-[#0a0a0a] rounded-2xl border border-[#222] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏢</span>
              <h3 className="text-base font-bold text-white">ملحقة المؤسسة (أقسام 2AM)</h3>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-[#aaa]">تفعيل الملحقة</span>
              <input
                type="checkbox"
                checked={hasAnnex}
                onChange={(e) => setHasAnnex(e.target.checked)}
                className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
              />
            </label>
          </div>

          {hasAnnex ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#aaa] font-bold mb-1">اسم الملحقة:</label>
                <input
                  type="text"
                  value={annexName}
                  onChange={(e) => setAnnexName(e.target.value)}
                  className="w-full p-2.5 bg-[#141414] border border-purple-900/40 rounded-xl text-white outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl text-purple-200">
                <div className="font-bold mb-1">الأقسام التربوية التابعة للملحقة:</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-1 bg-purple-900/60 text-purple-200 border border-purple-400/40 rounded-lg font-bold">
                    2AM4 (ملحقة)
                  </span>
                  <span className="px-2.5 py-1 bg-purple-900/60 text-purple-200 border border-purple-400/40 rounded-lg font-bold">
                    2AM5 (ملحقة)
                  </span>
                  <span className="px-2.5 py-1 bg-purple-900/60 text-purple-200 border border-purple-400/40 rounded-lg font-bold">
                    2AM6 (ملحقة)
                  </span>
                </div>
                <div className="text-[11px] text-purple-300/80 mt-2">
                  ⚡ خوارزمية الذكاء الاصطناعي مبرمجة لتجميع حصص الأساتذة المشتركين ومنع تنقلهم داخل نفس نصف اليوم، مع قصر الحركة على استراحة الظهيرة فقط.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#141414] rounded-xl text-center text-[#777] text-xs">
              الملحقة غير مفعلة (المؤسسة تعمل بمقر واحد فقط).
            </div>
          )}
        </div>

        {/* Card 4: Remedial Configuration */}
        <div className="bg-[#0a0a0a] rounded-2xl border border-[#222] p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[#222] pb-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
            <h3 className="text-base font-bold text-white">حصص الاستدراك والدعم التربوي (أحمر)</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#aaa] font-bold mb-1">يوم الاستدراك المفضل:</label>
                <select
                  value={remedialDay}
                  onChange={(e) => setRemedialDay(e.target.value)}
                  className="w-full p-2.5 bg-[#141414] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                >
                  {daysList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#aaa] font-bold mb-1">الفترة الزمنية:</label>
                <select
                  value={remedialPeriod}
                  onChange={(e) => setRemedialPeriod(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#141414] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                >
                  <option value={7}>الحصة 7 (مساءً 15:30 - 16:30)</option>
                  <option value={8}>الحصة 8 (مساءً 16:30 - 17:30)</option>
                  <option value={4}>الحصة 4 (نهاية الصباح 11:00 - 12:00)</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl text-red-200 text-[11px]">
              يتم تلوين حصص الاستدراك باللون <strong>الأحمر</strong> في الجدول التفاعلي وعند الطباعة، وتُسند للأساتذة ذوي النصاب الناقص لإكمال ساعاتهم القانونية.
            </div>
          </div>
        </div>
      </div>

      {/* Subject Pedagogical Days Table */}
      <div className="bg-[#0a0a0a] rounded-2xl border border-[#222] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#222] pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#d4af37]" />
            <h3 className="text-base font-bold text-white">
              الأيام البيداغوجية لتنسيق المواد التعليمية (نصف يوم لكل مادة)
            </h3>
          </div>
          <span className="text-xs text-[#888]">
            تلتزم الخوارزمية بعدم برمجة حصص للأساتذة خلال فترات التنسيق البيداغوجي المحددة
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {Object.entries(SUBJECT_METADATA).map(([sId, meta]) => {
            const current = subjectPedDays[sId as SubjectId] || { day: 'الثلاثاء', periodRange: 'afternoon' };

            return (
              <div
                key={sId}
                className="bg-[#121212] border border-[#222] rounded-xl p-3 space-y-2"
                style={{ borderRight: `3px solid ${meta.defaultColor}` }}
              >
                <div className="font-bold text-white">{meta.name}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={current.day}
                    onChange={(e) => {
                      setSubjectPedDays({
                        ...subjectPedDays,
                        [sId]: { ...current, day: e.target.value },
                      });
                    }}
                    className="p-1.5 bg-[#181818] border border-[#333] rounded-lg text-white text-[11px]"
                  >
                    {daysList.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <select
                    value={current.periodRange}
                    onChange={(e) => {
                      setSubjectPedDays({
                        ...subjectPedDays,
                        [sId]: { ...current, periodRange: e.target.value as any },
                      });
                    }}
                    className="p-1.5 bg-[#181818] border border-[#333] rounded-lg text-white text-[11px]"
                  >
                    <option value="afternoon">مساءً (13:30+)</option>
                    <option value="morning">صباحاً (08:00+)</option>
                    <option value="all_day">يوم كامل</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
