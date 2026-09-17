import React, { useMemo } from 'react';
import {
  Brain,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Building2,
  Clock,
  ShieldCheck,
  FileText,
  RefreshCw,
  UserPlus,
  BookOpen,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  TimetableSlot,
  Teacher,
  SchoolClass,
  Room,
  SubjectRule,
  InstitutionConfig,
} from '../types';
import { SUBJECT_METADATA } from '../data/officialData';
import { exportTimetableToWord } from '../services/exportService';

interface Props {
  slots: TimetableSlot[];
  teachers: Teacher[];
  classes: SchoolClass[];
  rooms: Room[];
  rules: SubjectRule[];
  config: InstitutionConfig;
  onApplyAiDirectives: () => void;
  onNavigateToTimetable: () => void;
}

export const ScheduleAdvisorView: React.FC<Props> = ({
  slots,
  teachers,
  classes,
  rooms,
  rules,
  config,
  onApplyAiDirectives,
  onNavigateToTimetable,
}) => {
  // 1. Comprehensive Teacher Workload & Gaps Audit
  const teacherAnalysis = useMemo(() => {
    return teachers.map((teacher) => {
      const teacherSlots = slots.filter((s) => s.teacherId === teacher.id);
      const totalHours = teacherSlots.length;
      const isOverloaded = totalHours > 20;
      const isUnderQuota = totalHours < 12;
      const isOptimal = totalHours >= 16 && totalHours <= 18;

      // Group slots by day
      const daysMap: Record<string, number[]> = {};
      teacherSlots.forEach((s) => {
        if (!daysMap[s.day]) daysMap[s.day] = [];
        daysMap[s.day].push(s.period);
      });

      let twoHourGapsCount = 0;
      let singleHourGapsCount = 0;
      let oneHourShiftsCount = 0;
      let annexMovementsCount = 0;

      Object.entries(daysMap).forEach(([day, periods]) => {
        periods.sort((a, b) => a - b);
        const morning = periods.filter((p) => p <= 4);
        const afternoon = periods.filter((p) => p >= 5);

        // Check 1-hour isolated shifts
        if (morning.length === 1) oneHourShiftsCount++;
        if (afternoon.length === 1) oneHourShiftsCount++;

        // Check 1-hour and 2-hour gaps inside morning or afternoon
        for (let i = 0; i < morning.length - 1; i++) {
          const diff = morning[i + 1] - morning[i];
          if (diff === 2) {
            singleHourGapsCount++;
          } else if (diff === 3) {
            twoHourGapsCount++;
          }
        }
        for (let i = 0; i < afternoon.length - 1; i++) {
          const diff = afternoon[i + 1] - afternoon[i];
          if (diff === 2) {
            singleHourGapsCount++;
          } else if (diff === 3) {
            twoHourGapsCount++;
          }
        }

        // Check annex vs main campus movement in same half-day
        const daySlots = teacherSlots.filter((s) => s.day === day);
        const morningAnnex = daySlots.filter((s) => s.period <= 4 && s.isAnnex);
        const morningMain = daySlots.filter((s) => s.period <= 4 && !s.isAnnex);
        if (morningAnnex.length > 0 && morningMain.length > 0) {
          annexMovementsCount++;
        }

        const afternoonAnnex = daySlots.filter((s) => s.period >= 5 && s.isAnnex);
        const afternoonMain = daySlots.filter((s) => s.period >= 5 && !s.isAnnex);
        if (afternoonAnnex.length > 0 && afternoonMain.length > 0) {
          annexMovementsCount++;
        }
      });

      return {
        teacher,
        totalHours,
        isOverloaded,
        isUnderQuota,
        isOptimal,
        twoHourGapsCount,
        singleHourGapsCount,
        oneHourShiftsCount,
        annexMovementsCount,
        activeDaysCount: Object.keys(daysMap).length,
      };
    });
  }, [teachers, slots]);

  // 2. Class Pedagogical Quality Audit
  const classAnalysis = useMemo(() => {
    return classes.map((cls) => {
      const classSlots = slots.filter((s) => s.classId === cls.id);
      const coreSubjects = new Set(['arabic', 'math', 'french', 'science', 'physics']);
      const morningCoreSlots = classSlots.filter((s) => coreSubjects.has(s.subjectId) && s.period <= 4);
      const totalCoreSlots = classSlots.filter((s) => coreSubjects.has(s.subjectId));

      const morningCoreRatio = totalCoreSlots.length > 0
        ? Math.round((morningCoreSlots.length / totalCoreSlots.length) * 100)
        : 100;

      const remedialCount = classSlots.filter((s) => s.type === 'remedial').length;
      const tdCount = classSlots.filter((s) => s.type === 'td').length;
      const tpCount = classSlots.filter((s) => s.type === 'tp').length;

      // Tuesday afternoon check
      const tuesdayAfternoonCount = classSlots.filter((s) => s.day === 'الثلاثاء' && s.period >= 5).length;

      return {
        cls,
        totalHours: classSlots.length,
        morningCoreRatio,
        remedialCount,
        tdCount,
        tpCount,
        tuesdayAfternoonCount,
      };
    });
  }, [classes, slots]);

  // 3. Overall Pedagogical Index (0 to 100)
  const healthMetrics = useMemo(() => {
    const totalTeachers = teachers.length;
    const overloadedTeachers = teacherAnalysis.filter((t) => t.isOverloaded);
    const underQuotaTeachers = teacherAnalysis.filter((t) => t.isUnderQuota);
    const totalTwoHourGaps = teacherAnalysis.reduce((acc, t) => acc + t.twoHourGapsCount, 0);
    const totalSingleHourGaps = teacherAnalysis.reduce((acc, t) => acc + t.singleHourGapsCount, 0);
    const totalOneHourShifts = teacherAnalysis.reduce((acc, t) => acc + t.oneHourShiftsCount, 0);
    const totalAnnexConflicts = teacherAnalysis.reduce((acc, t) => acc + t.annexMovementsCount, 0);

    const avgMorningCoreRatio = Math.round(
      classAnalysis.reduce((acc, c) => acc + c.morningCoreRatio, 0) / (classes.length || 1)
    );

    // Calculate score
    let score = 100;
    score -= overloadedTeachers.length * 7;
    score -= underQuotaTeachers.length * 4;
    score -= totalTwoHourGaps * 6; // strictly penalized
    score -= totalSingleHourGaps * 0.5; // very minor penalty when needed for algorithm relief
    score -= totalOneHourShifts * 3;
    score -= totalAnnexConflicts * 15;
    if (avgMorningCoreRatio < 70) score -= (70 - avgMorningCoreRatio);
    score = Math.max(10, Math.min(100, score));

    return {
      score,
      overloadedCount: overloadedTeachers.length,
      underQuotaCount: underQuotaTeachers.length,
      totalTwoHourGaps,
      totalSingleHourGaps,
      totalOneHourShifts,
      totalAnnexConflicts,
      avgMorningCoreRatio,
    };
  }, [teacherAnalysis, classAnalysis, teachers.length, classes.length]);

  // Export full diagnostic report to Word
  const handleExportDiagnosticWord = () => {
    let reportHtml = `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2 style="color: #059669; text-align: center;">تقرير التقييم البيداغوجي ورأي الذكاء الاصطناعي في استعمال الزمن</h2>
        <p style="text-align: center; color: #666;">المؤسسة: ${config.name} — الموسم الدراسي ${config.academicYear}</p>
        <hr style="border: 1px solid #d4af37;" />
        
        <h3>1. المؤشر البيداغوجي العام: ${healthMetrics.score} / 100</h3>
        <p>
          • نسبة تركيز المواد الأساسية صباحاً: <strong>${healthMetrics.avgMorningCoreRatio}%</strong><br />
          • عدد حالات ساعتين فراغ بالمنتصف (محظورة): <strong>${healthMetrics.totalTwoHourGaps}</strong><br />
          • عدد حالات ساعة فراغ اضطرارية (مسموحة عند الضرورة القصوى لتخفيف الضغط): <strong>${healthMetrics.totalSingleHourGaps}</strong><br />
          • عدد الحصص المنفردة (ساعة واحدة بالصباح أو المساء): <strong>${healthMetrics.totalOneHourShifts}</strong><br />
          • تعارض تنقل أساتذة الملحقة: <strong>${healthMetrics.totalAnnexConflicts}</strong>
        </p>

        <h3>2. تدقيق نصاب الأساتذة والتوصيات الإدارية</h3>
        <table border="1" style="width: 100%; border-collapse: collapse; text-align: center;">
          <tr style="background-color: #f3f4f6;">
            <th>الأستاذ</th>
            <th>المادة</th>
            <th>الحجم الفعلي</th>
            <th>النصاب القانوني</th>
            <th>الحالة</th>
            <th>توصية الذكاء الاصطناعي</th>
          </tr>
    `;

    teacherAnalysis.forEach((t) => {
      let status = 'نصاب مثالي';
      let rec = 'الجدول متوازن ومطابق للمعايير البيداغوجية.';
      let bg = '#ffffff';

      if (t.isOverloaded) {
        status = 'تخطي النصاب (>20 سا)';
        rec = 'يُوصى بإضافة أو استخلاف أستاذ إضافي لتوزيع العبء وتخفيف الإرهاق الذهني.';
        bg = '#fee2e2';
      } else if (t.isUnderQuota) {
        status = 'نقص النصاب (<12 سا)';
        rec = 'إكمال النصاب بحصص استدراك، أنشطة مكتبية أو مهام تنسيق بيداغوجي داخلي.';
        bg = '#fef3c7';
      }

      reportHtml += `
        <tr style="background-color: ${bg};">
          <td>${t.teacher.name}</td>
          <td>${SUBJECT_METADATA[t.teacher.subjectId]?.name || t.teacher.subjectId}</td>
          <td>${t.totalHours} سا</td>
          <td>${t.teacher.maxWeeklyHours} سا</td>
          <td><strong>${status}</strong></td>
          <td>${rec}</td>
        </tr>
      `;
    });

    reportHtml += `
        </table>

        <h3>3. تدقيق الأقسام التربوية والأنشطة النوعية</h3>
        <table border="1" style="width: 100%; border-collapse: collapse; text-align: center;">
          <tr style="background-color: #f3f4f6;">
            <th>القسم</th>
            <th>إجمالي الحصص</th>
            <th>المواد الأساسية صباحاً</th>
            <th>حصص الاستدراك (أحمر)</th>
            <th>أعمال موجهة TD (أصفر)</th>
            <th>أعمال تطبيقية TP (أخضر)</th>
          </tr>
    `;

    classAnalysis.forEach((c) => {
      reportHtml += `
        <tr>
          <td>${c.cls.name} (${c.cls.level})</td>
          <td>${c.totalHours} سا</td>
          <td>${c.morningCoreRatio}%</td>
          <td>${c.remedialCount}</td>
          <td>${c.tdCount}</td>
          <td>${c.tpCount}</td>
        </tr>
      `;
    });

    reportHtml += `
        </table>
        <br />
        <p style="text-align: left; font-size: 11px; color: #888;">
          تم إعداد هذا التقرير تلقائياً بواسطة نظام DALI AI SCHEDULER وفق المنشور الوزاري 2026.
        </p>
      </div>
    `;

    exportTimetableToWord(`تقرير_التقييم_البيداغوجي_${config.name}`, reportHtml, config.name);
  };

  return (
    <div id="schedule-advisor-view" className="space-y-6">
      {/* Top Banner with AI Advisor Persona */}
      <div className="bg-linear-to-r from-[#0d1b1e] via-[#0a0a0a] to-[#1a120a] rounded-2xl p-6 border border-[#2d3748] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-[#d4af37] to-[#997d1e] flex items-center justify-center shadow-lg text-black">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30">
                  DALI AI Pedagogical Advisor 2026
                </span>
                <span className="text-xs text-[#888]">مستشار الجداول البيداغوجي</span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                إحصائيات ورأي الذكاء الاصطناعي في استعمال الزمن
              </h2>
              <p className="text-xs text-[#aaa] max-w-2xl mt-1">
                تشخيص ذكي شامل لجداول الأساتذة والأقسام التربوية، كشف ثغرات الساعتين، تجنب الحصص المسائية المعزولة، وتكييف أساتذة الملحقة وإكمال الأنصبة القانونية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportDiagnosticWord}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0e1b2e] hover:bg-[#172b49] text-[#60a5fa] border border-[#60a5fa]/30 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>تصدير التقرير (Word)</span>
            </button>

            <button
              onClick={onApplyAiDirectives}
              className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-[#d4af37] to-[#b38f24] hover:from-[#c59e2e] hover:to-[#997d1e] text-black font-black rounded-xl text-xs shadow-lg transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>تطبيق المعالجة الذكية فوراً</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Score Card */}
        <div className="bg-[#0e0e0e] border border-[#222] p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#888]">مؤشر الراحة البيداغوجية</span>
            <TrendingUp className="w-5 h-5 text-[#d4af37]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{healthMetrics.score}</span>
            <span className="text-xs text-[#888]">/ 100</span>
          </div>
          <div className="mt-2 text-xs font-medium text-[#d4af37] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{healthMetrics.score >= 85 ? 'جدول ممتاز ومتوافق بيداغوجياً' : 'توجد بعض الملاحظات للتحسين'}</span>
          </div>
        </div>

        {/* 2-Hour Gaps */}
        <div className="bg-[#0e0e0e] border border-[#222] p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#888]">ساعتان فراغ بالمنتصف</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${healthMetrics.totalTwoHourGaps > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {healthMetrics.totalTwoHourGaps}
            </span>
            <span className="text-xs text-[#888]">حالة</span>
          </div>
          <div className="mt-2 text-xs text-[#aaa] space-y-0.5">
            <div>
              {healthMetrics.totalTwoHourGaps === 0
                ? '✅ تم القضاء على فراغات الساعتين تماماً'
                : '⚠️ فراغ ساعتين يرهق الأستاذ ويجب حظره'}
            </div>
            <div className="text-[11px] text-[#888]">
              ساعة فراغ اضطرارية: <span className="text-amber-300 font-bold">{healthMetrics.totalSingleHourGaps}</span> (مسموحة عند الضرورة القصوى)
            </div>
          </div>
        </div>

        {/* 1-Hour Shifts */}
        <div className="bg-[#0e0e0e] border border-[#222] p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#888]">حصص ساعة واحدة منفردة</span>
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${healthMetrics.totalOneHourShifts > 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
              {healthMetrics.totalOneHourShifts}
            </span>
            <span className="text-xs text-[#888]">فترة</span>
          </div>
          <div className="mt-2 text-xs text-[#aaa]">
            {healthMetrics.totalOneHourShifts === 0
              ? '✅ لا يأتي أي أستاذ لأجل ساعة واحدة'
              : '⚠️ يُفضل ربطها بحصة أخرى لتفادي التنقل'}
          </div>
        </div>

        {/* Morning Core Ratio */}
        <div className="bg-[#0e0e0e] border border-[#222] p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#888]">المواد الأساسية صباحاً</span>
            <BookOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">
              {healthMetrics.avgMorningCoreRatio}%
            </span>
            <span className="text-xs text-[#888]">فترات صباحية</span>
          </div>
          <div className="mt-2 text-xs text-[#aaa]">
            عربية، رياضيات، فرنسية، علوم، فيزياء
          </div>
        </div>
      </div>

      {/* Annex Movement Special Card if School has Annex */}
      {config.hasAnnex && (
        <div className="bg-[#120d1c] border border-purple-800/40 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-900/60 text-purple-300 border border-purple-500/40 flex items-center justify-center font-bold text-lg">
              🏢
            </div>
            <div>
              <div className="text-sm font-bold text-purple-200">
                حالة تنقل الأساتذة المشتركين بين المؤسسة الأم والملحقة (أقسام 2AM)
              </div>
              <div className="text-xs text-purple-300/80 mt-0.5">
                تكييف الجداول لمنع التنقل العشوائي وحصر حركة الأساتذة في وقت فراغ الظهيرة والغداء فقط.
              </div>
            </div>
          </div>
          <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-950 text-purple-300 border border-purple-600/40">
            {healthMetrics.totalAnnexConflicts === 0
              ? '✅ تنقل منضبط ومثالي: لا تنقل في نفس نصف اليوم'
              : `⚠️ ${healthMetrics.totalAnnexConflicts} حالات تنقل بحاجة لتجميع`}
          </div>
        </div>
      )}

      {/* AI Teacher Workload & Quota Advice Table */}
      <div className="bg-[#0a0a0a] rounded-2xl border border-[#222] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#222] pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#d4af37]" />
            <h3 className="text-base font-bold text-white">
              رأي الذكاء الاصطناعي في نصاب وساعات الأساتذة
            </h3>
          </div>
          <span className="text-xs text-[#888]">
            معايير القرار: نصاب قانوني 18 سا (أو 16 سا للأقدمية) • عتبة التخطي 20 سا • عتبة النقص 12 سا
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#111] text-[#999] font-bold border-b border-[#222]">
                <th className="p-3">الأستاذ</th>
                <th className="p-3">المادة</th>
                <th className="p-3">الساعات الفعلية</th>
                <th className="p-3">النصاب القانوني</th>
                <th className="p-3">فراغ ساعتين</th>
                <th className="p-3">ساعة فراغ (اضطرارية)</th>
                <th className="p-3">حصة منفردة (1 سا)</th>
                <th className="p-3">أيام العمل</th>
                <th className="p-3">تشخيص الذكاء الاصطناعي</th>
                <th className="p-3">الإجراء المقترح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {teacherAnalysis.map((item) => {
                const { teacher, totalHours, isOverloaded, isUnderQuota, isOptimal, twoHourGapsCount, singleHourGapsCount, oneHourShiftsCount, activeDaysCount } = item;
                const meta = SUBJECT_METADATA[teacher.subjectId];

                return (
                  <tr
                    key={teacher.id}
                    className={`hover:bg-[#141414] transition-colors ${
                      isOverloaded ? 'bg-red-950/15' : isUnderQuota ? 'bg-amber-950/15' : ''
                    }`}
                  >
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: meta?.defaultColor || '#d4af37' }}
                      />
                      <span>{teacher.name}</span>
                      {teacher.teachesInAnnex && (
                        <span className="text-[9px] bg-purple-900/60 text-purple-300 px-1 py-0.5 rounded">
                          ملحقة
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-[#ccc]">{meta?.name || teacher.subjectId}</td>
                    <td className="p-3 font-black text-sm">
                      <span
                        className={
                          isOverloaded
                            ? 'text-red-400'
                            : isUnderQuota
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        {totalHours} سا
                      </span>
                    </td>
                    <td className="p-3 text-[#888]">{teacher.maxWeeklyHours} سا</td>
                    <td className="p-3">
                      {twoHourGapsCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-red-950/50 text-red-300 border border-red-500/40 font-bold text-[10px]">
                          {twoHourGapsCount} (ممنوع)
                        </span>
                      ) : (
                        <span className="text-emerald-400/80 font-mono text-[11px]">0</span>
                      )}
                    </td>
                    <td className="p-3">
                      {singleHourGapsCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-950/40 text-amber-300 border border-amber-500/40 font-bold text-[10px]" title="ساعة فراغ واحدة اضطرارية مقبولة لتخفيف الضغط على خوارزميات التوليد">
                          {singleHourGapsCount} اضطرارية
                        </span>
                      ) : (
                        <span className="text-[#555] font-mono">0</span>
                      )}
                    </td>
                    <td className="p-3">
                      {oneHourShiftsCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-950/40 text-blue-300 border border-blue-500/40 font-bold text-[10px]">
                          {oneHourShiftsCount} منفردة
                        </span>
                      ) : (
                        <span className="text-[#555] font-mono">0</span>
                      )}
                    </td>
                    <td className="p-3 text-[#888]">{activeDaysCount} أيام</td>
                    <td className="p-3 font-medium">
                      {isOverloaded ? (
                        <span className="text-red-400 flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>تجاوز النصاب القانوني ({totalHours} سا)</span>
                        </span>
                      ) : isUnderQuota ? (
                        <span className="text-amber-400 flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>نقص في النصاب ({totalHours} سا)</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>نصاب بيداغوجي متزن</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {isOverloaded ? (
                        <div className="text-[11px] text-red-300 bg-red-950/40 border border-red-500/40 px-2 py-1 rounded-lg">
                          💡 <strong>الأفضل إضافة أستاذ جديد</strong> أو تقسيم الأفواج لتخفيف الإرهاق.
                        </div>
                      ) : isUnderQuota ? (
                        <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/40 px-2 py-1 rounded-lg">
                          💡 <strong>يُنصح بإكمال النصاب</strong> بحصص استدراك ودعم أو مهام تنسيق المادة.
                        </div>
                      ) : twoHourGapsCount > 0 ? (
                        <div className="text-[11px] text-red-300/90">
                          ⚡ سد فراغ الساعتين بالمنتصف بحذف الفراغ أو تقديم الحصص.
                        </div>
                      ) : singleHourGapsCount > 0 ? (
                        <div className="text-[11px] text-amber-300/90">
                          ℹ️ ساعة فراغ اضطرارية مقبولة لتخفيف الضغط على الجدول.
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-400/80">
                          👍 جدول متصل مثالي (0 فراغ) ومطابق للمنشور.
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class Level & Special Activities Quality */}
      <div className="bg-[#0a0a0a] rounded-2xl border border-[#222] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#222] pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              تشخيص الأقسام وحصص الاستدراك والتفويج (TD/TP)
            </h3>
          </div>
          <span className="text-xs text-[#888]">
            🔴 استدراك (أحمر) • 🟡 أعمال موجهة TD (أصفر) • 🟢 أعمال تطبيقية TP (أخضر)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {classAnalysis.map((item) => {
            const { cls, totalHours, morningCoreRatio, remedialCount, tdCount, tpCount } = item;
            return (
              <div
                key={cls.id}
                className="bg-[#121212] border border-[#222] rounded-xl p-3.5 space-y-2 hover:border-[#333] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{cls.name}</span>
                  <span className="text-[10px] bg-[#1a1a1a] text-[#888] px-2 py-0.5 rounded">
                    المستوى: {cls.level}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#aaa]">
                  <span>إجمالي الساعات: <strong className="text-white">{totalHours} سا</strong></span>
                  <span>المواد الأساسية صباحاً: <strong className="text-emerald-400">{morningCoreRatio}%</strong></span>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-[#1e1e1e]">
                  <span className="text-[10px] bg-red-950/40 text-red-300 border border-red-500/40 px-1.5 py-0.5 rounded font-bold">
                    استدراك: {remedialCount}
                  </span>
                  <span className="text-[10px] bg-amber-950/40 text-amber-300 border border-amber-400/40 px-1.5 py-0.5 rounded font-bold">
                    TD موجهة: {tdCount}
                  </span>
                  <span className="text-[10px] bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold">
                    TP مخابر: {tpCount}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
