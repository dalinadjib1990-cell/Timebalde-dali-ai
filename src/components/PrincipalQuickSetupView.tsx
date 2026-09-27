import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Users,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Scale,
  RefreshCw,
  Info,
  Layers,
  Building2,
  Heart,
  Save,
  MessageSquare,
  Award,
  CheckSquare,
  Square,
  History,
} from 'lucide-react';
import {
  SchoolClass,
  Teacher,
  InstitutionConfig,
  SubjectRule,
  GradeLevel,
  SubjectId,
  SavedTimetableVersion,
  TimetableSlot,
  Room,
} from '../types';
import { GenerationDirectives } from '../services/scheduler';
import { SUBJECT_METADATA } from '../data/officialData';
import { OFFICIAL_ALGERIAN_PEDAGOGICAL_SCHEDULE } from '../services/pedagogicalDaysAiService';
import { generateStructuralTeacherPositions } from '../data/defaultSchool';
import { AiCritiqueModal, AiCritiqueData } from './AiCritiqueModal';
import { fetchAiTimetableCritique } from '../services/aiCritiqueService';

interface Props {
  classes: SchoolClass[];
  teachers: Teacher[];
  config: InstitutionConfig;
  rules: SubjectRule[];
  savedVersions?: SavedTimetableVersion[];
  slots?: TimetableSlot[];
  rooms?: Room[];
  onUpdateClasses: (updatedClasses: SchoolClass[]) => void;
  onUpdateTeachers: (updatedTeachers: Teacher[]) => void;
  onUpdateConfig: (updatedConfig: InstitutionConfig) => void;
  onGenerateTimetable: (directives?: GenerationDirectives) => void;
  onNavigateToTimetables: () => void;
  onSaveVersion?: (versionName?: string, notes?: string) => SavedTimetableVersion;
  onRestoreVersion?: (version: SavedTimetableVersion) => void;
  onDeleteVersion?: (versionId: string) => void;
}

export const PrincipalQuickSetupView: React.FC<Props> = ({
  classes,
  teachers,
  config,
  rules,
  savedVersions = [],
  slots = [],
  rooms = [],
  onUpdateClasses,
  onUpdateTeachers,
  onUpdateConfig,
  onGenerateTimetable,
  onNavigateToTimetables,
  onSaveVersion,
  onRestoreVersion,
  onDeleteVersion,
}) => {
  // Step 1: Classes Count per Level
  const [count1AM, setCount1AM] = useState<number>(() => {
    const c = classes.filter((cls) => cls.level === '1AM').length;
    return c > 0 ? c : 5;
  });
  const [count2AM, setCount2AM] = useState<number>(() => {
    const c = classes.filter((cls) => cls.level === '2AM').length;
    return c > 0 ? c : 5;
  });
  const [count3AM, setCount3AM] = useState<number>(() => {
    const c = classes.filter((cls) => cls.level === '3AM').length;
    return c > 0 ? c : 5;
  });
  const [count4AM, setCount4AM] = useState<number>(() => {
    const c = classes.filter((cls) => cls.level === '4AM').length;
    return c > 0 ? c : 4;
  });

  const totalClassesCount = count1AM + count2AM + count3AM + count4AM;

  // Annex Classes Selection
  const [annexClassIds, setAnnexClassIds] = useState<string[]>(() => {
    return classes.filter((c) => c.isAnnex).map((c) => c.id);
  });

  // Step 2: Subject Pedagogical Days (Supports: all_day, morning, afternoon)
  const [subjectDays, setSubjectDays] = useState<
    Record<SubjectId, { day: string; periodRange: 'morning' | 'afternoon' | 'all_day' }>
  >(() => {
    const existing = config.subjectPedagogicalDays || {};
    const initial: any = {};
    (Object.keys(SUBJECT_METADATA) as SubjectId[]).forEach((sId) => {
      initial[sId] = existing[sId] || OFFICIAL_ALGERIAN_PEDAGOGICAL_SCHEDULE[sId] || {
        day: 'الثلاثاء',
        periodRange: 'afternoon',
      };
    });
    return initial;
  });

  // Remedial Sessions Configuration (+1 سا استدراك لكل مادة أساسية)
  const [enableRemedial, setEnableRemedial] = useState<boolean>(true);
  const [remedialDay, setRemedialDay] = useState<string>(config.remedialDay || 'الثلاثاء');
  const [selectedRemedialSubjects, setSelectedRemedialSubjects] = useState<SubjectId[]>([
    'arabic',
    'math',
    'french',
    'english',
    'science',
    'physics',
  ]);

  // Teacher Comfort & Annex Minimize Commute Directive
  const [prioritizeTeacherComfort, setPrioritizeTeacherComfort] = useState<boolean>(true);

  // Restrict 15:00 - 16:00 (Period 7) to Remedial sessions only
  const [restrictPeriod7ToRemedial, setRestrictPeriod7ToRemedial] = useState<boolean>(true);

  // Step 3: Teacher Input Form
  const [teacherName, setTeacherName] = useState('');
  const [teacherSubject, setTeacherSubject] = useState<SubjectId>('arabic');
  const [teacherAssignedClasses, setTeacherAssignedClasses] = useState<string[]>([]);
  const [teacherMaxHours, setTeacherMaxHours] = useState(18);
  const [teacherPedDay, setTeacherPedDay] = useState<string>('الثلاثاء');
  const [teacherPedRange, setTeacherPedRange] = useState<'morning' | 'afternoon' | 'all_day'>('afternoon');
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  // Update teacher pedagogical defaults when teacherSubject changes
  React.useEffect(() => {
    if (!editingTeacherId && subjectDays[teacherSubject]) {
      setTeacherPedDay(subjectDays[teacherSubject].day);
      setTeacherPedRange(subjectDays[teacherSubject].periodRange);
    }
  }, [teacherSubject, subjectDays, editingTeacherId]);

  // AI Critique State
  const [showCritiqueModal, setShowCritiqueModal] = useState(false);
  const [critiqueData, setCritiqueData] = useState<AiCritiqueData | null>(null);
  const [isCritiqueLoading, setIsCritiqueLoading] = useState(false);

  // Inline Save Version State
  const [showSaveVersionBox, setShowSaveVersionBox] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionNotes, setNewVersionNotes] = useState('');

  // Auto-calculated weekly teaching hours based on assigned classes and subject weekly quota
  const calculatedTeachingHours = useMemo(() => {
    let total = 0;
    teacherAssignedClasses.forEach((cId) => {
      const cls = classes.find((c) => c.id === cId);
      if (cls) {
        const rule = rules.find((r) => r.subject_id === teacherSubject && r.level === cls.level);
        total += rule ? rule.weekly_hours : 4;
      }
    });
    return total;
  }, [teacherAssignedClasses, teacherSubject, classes, rules]);

  // Handle Apply Classes Count
  const handleApplyClassesCount = () => {
    const newClasses: SchoolClass[] = [];

    // 1AM
    for (let i = 1; i <= count1AM; i++) {
      const id = `1am${i}`;
      newClasses.push({
        id,
        name: `1AM${i}`,
        level: '1AM',
        studentCount: 35,
        assignedRoomId: `room-${String(newClasses.length + 1).padStart(2, '0')}`,
        isAnnex: annexClassIds.includes(id),
      });
    }
    // 2AM
    for (let i = 1; i <= count2AM; i++) {
      const id = `2am${i}`;
      newClasses.push({
        id,
        name: `2AM${i}`,
        level: '2AM',
        studentCount: 35,
        assignedRoomId: `room-${String(newClasses.length + 1).padStart(2, '0')}`,
        isAnnex: annexClassIds.includes(id),
      });
    }
    // 3AM
    for (let i = 1; i <= count3AM; i++) {
      const id = `3am${i}`;
      newClasses.push({
        id,
        name: `3AM${i}`,
        level: '3AM',
        studentCount: 35,
        assignedRoomId: `room-${String(newClasses.length + 1).padStart(2, '0')}`,
        isAnnex: annexClassIds.includes(id),
      });
    }
    // 4AM
    for (let i = 1; i <= count4AM; i++) {
      const id = `4am${i}`;
      newClasses.push({
        id,
        name: `4AM${i}`,
        level: '4AM',
        studentCount: 35,
        assignedRoomId: `room-${String(newClasses.length + 1).padStart(2, '0')}`,
        isAnnex: annexClassIds.includes(id),
      });
    }

    onUpdateClasses(newClasses);
  };

  // Toggle annex status for a class
  const toggleClassAnnex = (classId: string) => {
    const updatedAnnexIds = annexClassIds.includes(classId)
      ? annexClassIds.filter((id) => id !== classId)
      : [...annexClassIds, classId];

    setAnnexClassIds(updatedAnnexIds);

    const updatedClasses = classes.map((c) => ({
      ...c,
      isAnnex: updatedAnnexIds.includes(c.id),
    }));
    onUpdateClasses(updatedClasses);

    // Also update config hasAnnex
    onUpdateConfig({
      ...config,
      hasAnnex: updatedAnnexIds.length > 0,
    });
  };

  // Handle Save Pedagogical Days to Config and update teacher unavailabilities
  const handleSavePedagogicalDays = (
    newSchedule: Record<SubjectId, { day: string; periodRange: 'morning' | 'afternoon' | 'all_day' }>
  ) => {
    setSubjectDays(newSchedule);
    const updatedConfig: InstitutionConfig = {
      ...config,
      subjectPedagogicalDays: newSchedule,
    };
    onUpdateConfig(updatedConfig);

    // Also update existing teachers pedagogical day and slots
    if (teachers.length > 0) {
      const updatedTeachers = teachers.map((t) => {
        const pedRule = newSchedule[t.subjectId];
        if (!pedRule) return t;

        const cleanUnavail = t.unavailableSlots.filter(
          (u) => !u.reason?.includes('بيداغوجي') && !u.reason?.includes('ندوة')
        );

        let periods = [1, 2, 3, 4];
        if (pedRule.periodRange === 'all_day') {
          periods = [1, 2, 3, 4, 5, 6, 7, 8];
        } else if (pedRule.periodRange === 'afternoon') {
          periods = [5, 6, 7, 8];
        }

        const newSlots = periods.map((p) => ({
          day: pedRule.day,
          period: p,
          reason: `اليوم البيداغوجي لمادة ${SUBJECT_METADATA[t.subjectId]?.name || t.subjectId}`,
        }));

        return {
          ...t,
          pedagogicalDay: pedRule.day,
          pedagogicalPeriodRange: pedRule.periodRange,
          unavailableSlots: [...cleanUnavail, ...newSlots],
        };
      });
      onUpdateTeachers(updatedTeachers);
    }
  };

  // Quick 1-click Algerian official pedagogical schedule
  const handleApplyOfficialPedSchedule = () => {
    handleSavePedagogicalDays(OFFICIAL_ALGERIAN_PEDAGOGICAL_SCHEDULE);
  };

  // Toggle class selection for teacher
  const toggleTeacherClass = (cId: string) => {
    if (teacherAssignedClasses.includes(cId)) {
      setTeacherAssignedClasses(teacherAssignedClasses.filter((id) => id !== cId));
    } else {
      setTeacherAssignedClasses([...teacherAssignedClasses, cId]);
    }
  };

  // Add or Edit Teacher
  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) return;

    let pedPeriods = [1, 2, 3, 4];
    if (teacherPedRange === 'all_day') {
      pedPeriods = [1, 2, 3, 4, 5, 6, 7, 8];
    } else if (teacherPedRange === 'afternoon') {
      pedPeriods = [5, 6, 7, 8];
    }

    const pedSlots = pedPeriods.map((p) => ({
      day: teacherPedDay,
      period: p,
      reason: `اليوم البيداغوجي (${teacherPedRange === 'all_day' ? 'يوم كامل مفرغ' : teacherPedRange === 'morning' ? 'صباحاً' : 'مساءً'}) لمادة ${SUBJECT_METADATA[teacherSubject]?.name}`,
    }));

    const teachesInAnnex = teacherAssignedClasses.some((cId) => annexClassIds.includes(cId));

    if (editingTeacherId) {
      const updated = teachers.map((t) => {
        if (t.id === editingTeacherId) {
          return {
            ...t,
            name: teacherName.trim(),
            subjectId: teacherSubject,
            assignedClassIds: teacherAssignedClasses,
            maxWeeklyHours: teacherMaxHours,
            pedagogicalDay: teacherPedDay,
            pedagogicalPeriodRange: teacherPedRange,
            teachesInAnnex,
            unavailableSlots: [
              ...t.unavailableSlots.filter((u) => !u.reason?.includes('بيداغوجي')),
              ...pedSlots,
            ],
          };
        }
        return t;
      });
      onUpdateTeachers(updated);
      setEditingTeacherId(null);
    } else {
      const newTeacher: Teacher = {
        id: `t-${teacherSubject}-${Date.now().toString().slice(-4)}`,
        name: teacherName.trim(),
        subjectId: teacherSubject,
        assignedClassIds: teacherAssignedClasses,
        maxWeeklyHours: teacherMaxHours,
        minWeeklyHours: 16,
        pedagogicalDay: teacherPedDay,
        pedagogicalPeriodRange: teacherPedRange,
        teachesInAnnex,
        unavailableSlots: pedSlots,
        notes: `أستاذ مادة ${SUBJECT_METADATA[teacherSubject]?.name}`,
      };
      onUpdateTeachers([...teachers, newTeacher]);
    }

    // Reset Form
    setTeacherName('');
    setTeacherAssignedClasses([]);
  };

  // Edit Teacher
  const handleStartEditTeacher = (t: Teacher) => {
    setEditingTeacherId(t.id);
    setTeacherName(t.name);
    setTeacherSubject(t.subjectId);
    setTeacherAssignedClasses([...t.assignedClassIds]);
    setTeacherMaxHours(t.maxWeeklyHours);
    setTeacherPedDay(t.pedagogicalDay || subjectDays[t.subjectId]?.day || 'الثلاثاء');
    setTeacherPedRange(t.pedagogicalPeriodRange || subjectDays[t.subjectId]?.periodRange || 'afternoon');
  };

  // Delete Teacher
  const handleDeleteTeacher = (tId: string) => {
    onUpdateTeachers(teachers.filter((t) => t.id !== tId));
    if (editingTeacherId === tId) {
      setEditingTeacherId(null);
      setTeacherName('');
      setTeacherAssignedClasses([]);
    }
  };

  // Quick fill structural positions without fake personal names
  const handleQuickCreateStructuralPositions = () => {
    if (
      window.confirm(
        'هل تريد توليد هيكل مناصب المواد آلياً (مثل: أستاذ رياضيات 1، أستاذ لغة عربية 1...) دون أسماء أشخاص وهمية؟ سيمكنك تغيير أسمائها يدوياً في أي وقت.'
      )
    ) {
      const generated = generateStructuralTeacherPositions(classes, rules);
      onUpdateTeachers(generated);
    }
  };

  // Clear all teachers
  const handleClearAllTeachers = () => {
    if (window.confirm('هل تريد مسح وتفريغ قائمة الأساتذة بالكامل للبدء من الصفر؟')) {
      onUpdateTeachers([]);
      setEditingTeacherId(null);
      setTeacherName('');
      setTeacherAssignedClasses([]);
    }
  };

  // Trigger Timetable Generation with Directives
  const handleTriggerGeneration = (withTeacherComfort = prioritizeTeacherComfort) => {
    // Sync remedial config
    if (enableRemedial) {
      onUpdateConfig({
        ...config,
        remedialDay,
        hasAnnex: annexClassIds.length > 0,
      });
    }

    const directives: GenerationDirectives = {
      prioritizeTeacherComfort: withTeacherComfort,
      clusterAnnexTeachers: withTeacherComfort || annexClassIds.length > 0,
      minimizeTeacherGaps: withTeacherComfort,
      avoidTwoHourGaps: true,
      allowSingleGapOnNecessity: true,
      avoidSingleHourShifts: true,
      scheduleRemedialSlots: enableRemedial,
      annexClassIds,
      respectSubjectPedagogicalDays: true,
      restrictPeriod7ToRemedial,
      preferMorningCore: true,
      tuesdayAfternoonOff: config.tuesdayAfternoonOff,
    };

    onGenerateTimetable(directives);
  };

  // Open AI Critique
  const handleOpenAiCritique = async () => {
    setIsCritiqueLoading(true);
    setShowCritiqueModal(true);
    setCritiqueData(null);

    const critique = await fetchAiTimetableCritique(
      slots,
      classes,
      teachers,
      rooms,
      rules,
      config,
      annexClassIds
    );

    setCritiqueData(critique);
    setIsCritiqueLoading(false);
  };

  // Save current timetable version
  const handleSaveCurrentVersion = (name?: string, notes?: string) => {
    if (onSaveVersion) {
      const vName = name || newVersionName || `نسخة المؤسسة المعتمدة (${new Date().toLocaleDateString('ar-DZ')})`;
      const vNotes = notes || newVersionNotes || 'نسخة تم اعتمادها ومراجعتها بيداغوجياً';
      onSaveVersion(vName, vNotes);
      setShowSaveVersionBox(false);
      setNewVersionName('');
      setNewVersionNotes('');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#181308] via-[#101010] to-[#0a0a0a] border border-[#d4af37]/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1f1708] border border-[#d4af37]/50 rounded-full text-[#d4af37] text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>لوحة إعدادات وتنظيم المدير السهلة المباشرة</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <span>مدخلات المؤسسة وهيئة التدريس والتوليد الشامل</span>
            </h1>
            <p className="text-xs text-[#aaa] mt-1 max-w-2xl leading-relaxed">
              واجهة مبسطة لمدير المؤسسة: حدد عدد أقسام كل مستوى، حدد أقسام الملحقة، اضبط اليوم البيداغوجي (يوم كامل أو نصف يوم)،
              حصص الاستدراك (+1 سا للمواد الأساسية)، وأدخل أساتذتك وأقسامهم المسندة دون أي أسماء وهمية، مع تقييم صريح بالذكاء الاصطناعي وحفظ النسخ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleTriggerGeneration(prioritizeTeacherComfort)}
              className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#d4af37] to-[#b38f20] hover:from-[#c59e2e] hover:to-[#9c7a16] text-black font-extrabold text-sm rounded-xl shadow-xl transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>⚡ بدء التوليد الآلي الشامل</span>
            </button>
            <button
              onClick={onNavigateToTimetables}
              className="flex items-center gap-2 px-4 py-3 bg-[#181818] hover:bg-[#222] text-[#ccc] border border-[#333] font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>عرض استعمال الزمن التفاعلي</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-5 pt-4 border-t border-[#222] grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-2.5 bg-[#141414] rounded-xl border border-[#222]">
            <div className="text-[11px] text-[#888] font-bold">مجموع الأقسام بالمؤسسة</div>
            <div className="text-lg font-bold text-[#d4af37] mt-0.5">{classes.length} قسماً</div>
          </div>
          <div className="p-2.5 bg-[#141414] rounded-xl border border-[#222]">
            <div className="text-[11px] text-[#888] font-bold">أقسام الملحقة (الملحقة)</div>
            <div className="text-lg font-bold text-purple-400 mt-0.5">{annexClassIds.length} أقسام</div>
          </div>
          <div className="p-2.5 bg-[#141414] rounded-xl border border-[#222]">
            <div className="text-[11px] text-[#888] font-bold">الأساتذة المدخلين</div>
            <div className="text-lg font-bold text-white mt-0.5">{teachers.length} أستاذ(ة)</div>
          </div>
          <div className="p-2.5 bg-[#141414] rounded-xl border border-[#222]">
            <div className="text-[11px] text-[#888] font-bold">الأعمال الموجهة (TD)</div>
            <div className="text-xs font-bold text-emerald-400 mt-1">1 سا عربية + 1 سا رياضيات</div>
          </div>
          <div className="p-2.5 bg-[#141414] rounded-xl border border-[#222]">
            <div className="text-[11px] text-[#888] font-bold">حصص الاستدراك (+1 سا)</div>
            <div className="text-xs font-bold text-amber-300 mt-1">
              {enableRemedial ? 'مفعلة للمواد الأساسية' : 'غير مفعلة'}
            </div>
          </div>
        </div>
      </div>

      {/* Generation Results & AI Frank Evaluation Bar (When Slots Exist) */}
      {slots.length > 0 && (
        <div className="bg-[#121212] border border-[#d4af37]/40 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1c1608] border border-[#d4af37]/60 flex items-center justify-center text-[#d4af37] shrink-0">
              <Sparkles className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>تم توليد استعمال الزمن بنجاح بعدد {slots.length} حصة موزعة</span>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px]">
                  جاهز للاعتماد
                </span>
              </div>
              <p className="text-[11px] text-[#888]">
                يمكنك الآن حفظ النسخة في السجل، طلب الرأي الصريح للذكاء الاصطناعي، أو إعادة التوليد بمراعاة راحة الأساتذة وتنقل الملحقة.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenAiCritique}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1c142b] hover:bg-[#281c3d] text-[#c084fc] border border-[#c084fc]/50 text-xs font-bold rounded-xl shadow cursor-pointer transition-all active:scale-95"
            >
              <MessageSquare className="w-4 h-4 text-[#c084fc]" />
              <span>🤖 رأي الذكاء الاصطناعي بصراحة</span>
            </button>

            <button
              onClick={() => setShowSaveVersionBox(!showSaveVersionBox)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1a251a] hover:bg-[#233323] text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl shadow cursor-pointer transition-all active:scale-95"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>💾 حفظ هذا التوليد بالسجل</span>
            </button>
          </div>
        </div>
      )}

      {/* Inline Save Version Box */}
      {showSaveVersionBox && (
        <div className="p-4 bg-[#141414] border border-[#d4af37]/50 rounded-2xl space-y-3 animate-in fade-in">
          <div className="font-bold text-xs text-[#d4af37] flex items-center gap-2">
            <Save className="w-4 h-4" />
            <span>حفظ الجدول الحالي في سجل النسخ المعتمدة:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={newVersionName}
              onChange={(e) => setNewVersionName(e.target.value)}
              placeholder="اسم النسخة (مثال: النسخة النموذجية بعد ضبط الملحقة)..."
              className="p-2.5 bg-[#1c1c1c] border border-[#333] rounded-xl text-white text-xs font-bold focus:border-[#d4af37] outline-hidden"
            />
            <input
              type="text"
              value={newVersionNotes}
              onChange={(e) => setNewVersionNotes(e.target.value)}
              placeholder="ملاحظات حول النسخة..."
              className="p-2.5 bg-[#1c1c1c] border border-[#333] rounded-xl text-white text-xs focus:border-[#d4af37] outline-hidden placeholder-[#666]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowSaveVersionBox(false)}
              className="px-4 py-1.5 bg-[#222] text-[#888] rounded-xl text-xs font-bold hover:text-white cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={() => handleSaveCurrentVersion()}
              className="px-5 py-1.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black font-extrabold rounded-xl text-xs cursor-pointer shadow"
            >
              حفظ الآن في السجل
            </button>
          </div>
        </div>
      )}

      {/* Official Clarification Banner for 4AM (4+1) and 15:00 End Time */}
      <div className="bg-[#121814] border border-emerald-500/40 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1.5 text-xs">
          <div className="font-bold text-emerald-300 flex items-center gap-2">
            <span>التنظيم التربوي المعتمد للسنة الرابعة متوسط (4AM - شهادة BEM):</span>
            <span className="px-2 py-0.5 bg-emerald-900/60 text-emerald-200 border border-emerald-500/30 rounded-full text-[10px]">
              نظام 4+1 وساعات كاملة
            </span>
          </div>
          <p className="text-[#ccc] leading-relaxed">
            • في السنة الرابعة متوسط: مادتا <strong>اللغة العربية</strong> و<strong>الرياضيات</strong> مبرمجتان بصيغة <strong>(4+1)</strong>: <strong>4 ساعات دروس نظامية + 1 ساعة استدراك/أعمال موجهة</strong>، بدون أنصاف ساعات نهائياً (الحصص كلها ساعات كاملة: فرنسية 4 سا، علوم 2 سا، فيزياء 2 سا). حصص الـ 30 دقيقة تطبق فقط على المستويات الأخرى ولا تنطبق على 4 متوسط.
          </p>
          <p className="text-[#ccc] leading-relaxed">
            • <strong>قاعدة إنهاء الدروس النظامية (15:00):</strong> تنتهي الدروس النظامية لجميع الأقسام على الساعة 15:00. الحصة من <strong>15:00 إلى 16:00 (الحصة 7)</strong> محظورة تماماً على الدروس العادية ومخصصة حصرياً لساعة الاستدراك والدعم التربوي فقط.
          </p>
        </div>
      </div>

      {/* Step 1: Classes Count Configuration & Annex Definition */}
      <div className="bg-[#0e0e0e] border border-[#222] rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#181818] border border-[#333] flex items-center justify-center text-[#d4af37] font-bold">
              1
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                <span>تحديد عدد الأقسام في كل مستوى وأقسام الملحقة</span>
              </h2>
              <p className="text-[11px] text-[#888]">
                حدد عدد الأفواج لكل سنة متوسط، وحدد الأقسام التي تقع في ملحقة المؤسسة لتسهيل تنقل الأساتذة
              </p>
            </div>
          </div>
          <div className="px-3 py-1 bg-[#1a1408] border border-[#d4af37]/40 rounded-xl text-xs font-bold text-[#d4af37]">
            المجموع الكلي: {totalClassesCount} قسماً
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-[#141414] border border-[#262626] rounded-xl space-y-1.5">
            <label className="block text-xs font-bold text-[#4ade80]">
              السنة الأولى (1AM):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={15}
                value={count1AM}
                onChange={(e) => setCount1AM(Math.max(1, Number(e.target.value)))}
                className="w-full p-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-white font-bold text-center text-sm focus:border-[#4ade80] outline-hidden"
              />
              <span className="text-xs text-[#888]">أفواج</span>
            </div>
          </div>

          <div className="p-3 bg-[#141414] border border-[#262626] rounded-xl space-y-1.5">
            <label className="block text-xs font-bold text-[#60a5fa]">
              السنة الثانية (2AM):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={15}
                value={count2AM}
                onChange={(e) => setCount2AM(Math.max(1, Number(e.target.value)))}
                className="w-full p-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-white font-bold text-center text-sm focus:border-[#60a5fa] outline-hidden"
              />
              <span className="text-xs text-[#888]">أفواج</span>
            </div>
          </div>

          <div className="p-3 bg-[#141414] border border-[#262626] rounded-xl space-y-1.5">
            <label className="block text-xs font-bold text-[#f59e0b]">
              السنة الثالثة (3AM):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={15}
                value={count3AM}
                onChange={(e) => setCount3AM(Math.max(1, Number(e.target.value)))}
                className="w-full p-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-white font-bold text-center text-sm focus:border-[#f59e0b] outline-hidden"
              />
              <span className="text-xs text-[#888]">أفواج</span>
            </div>
          </div>

          <div className="p-3 bg-[#141414] border border-[#262626] rounded-xl space-y-1.5">
            <label className="block text-xs font-bold text-[#f87171]">
              السنة الرابعة (4AM - BEM):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={15}
                value={count4AM}
                onChange={(e) => setCount4AM(Math.max(1, Number(e.target.value)))}
                className="w-full p-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-white font-bold text-center text-sm focus:border-[#f87171] outline-hidden"
              />
              <span className="text-xs text-[#888]">أفواج</span>
            </div>
          </div>
        </div>

        {/* Annex Classes Tagging Section */}
        <div className="p-4 bg-[#141414] border border-purple-500/30 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-purple-300">
                أقسام ملحقة المؤسسة (انقر على القسم لتحديده كقسم تابع للملحقة):
              </span>
            </div>
            <span className="text-[11px] text-purple-400 font-bold">
              {annexClassIds.length} أقسام محددة في الملحقة
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {classes.map((c) => {
              const isAnnex = annexClassIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleClassAnnex(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isAnnex
                      ? 'bg-purple-900/70 text-purple-200 border border-purple-400/60 shadow-md scale-102'
                      : 'bg-[#1e1e1e] text-[#aaa] border border-[#333] hover:border-purple-500/40 hover:text-white'
                  }`}
                >
                  <span>{c.name}</span>
                  {isAnnex && <span className="text-[9px] bg-purple-950 px-1 rounded">ملحقة 🏢</span>}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[#888]">
            * عند تفعيل خيار "مراعاة راحة الأستاذ والملحقة"، يتم تجميع حصص الأستاذ في الملحقة في نفس نصف اليوم لتفادي التنقل المرهق بين المقر والملحقة.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-1.5 max-w-2xl">
            <span className="text-[11px] text-[#888] font-bold">الأقسام الحالية:</span>
            {classes.map((c) => (
              <span
                key={c.id}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                  c.isAnnex
                    ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                    : 'bg-[#181818] border-[#2e2e2e] text-[#ccc]'
                }`}
              >
                {c.name} {c.isAnnex && '🏢'}
              </span>
            ))}
          </div>

          <button
            onClick={handleApplyClassesCount}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#d4af37] hover:bg-[#c59e2e] text-black font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تطبيق وتحديث قائمة الأقسام</span>
          </button>
        </div>
      </div>

      {/* Step 2: Subject Pedagogical Days (Supports: all_day, morning, afternoon) */}
      <div className="bg-[#0e0e0e] border border-[#222] rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#181818] border border-[#333] flex items-center justify-center text-[#c084fc] font-bold">
              2
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                <span>تحديد اليوم البيداغوجي المعتمد لكل مادة (يوم كامل فارغ كلياً أو نصف يوم)</span>
              </h2>
              <p className="text-[11px] text-[#888]">
                يُخصص للتنسيق وندوات المادة ويُقفل تلقائياً في جدول أساتذة المادة — يمكن للمدير تفريغ يوم كامل كلياً للأستاذ
              </p>
            </div>
          </div>

          <button
            onClick={handleApplyOfficialPedSchedule}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1c142b] hover:bg-[#281c3d] text-[#c084fc] border border-[#c084fc]/50 text-xs font-bold rounded-xl cursor-pointer transition-all"
            title="تطبيق التوزيع الوزاري الجزائري المعتمد"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>الجدول الوزاري النموذجي بالـ AI</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {(
            [
              'arabic',
              'math',
              'french',
              'english',
              'science',
              'physics',
              'history',
              'islamic',
              'civic',
              'pe',
              'art_music',
              'computer',
            ] as SubjectId[]
          ).map((sId) => {
            const meta = SUBJECT_METADATA[sId];
            const current = subjectDays[sId] || { day: 'الثلاثاء', periodRange: 'morning' };

            return (
              <div
                key={sId}
                className="p-3 bg-[#141414] border border-[#252525] rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs" style={{ color: meta?.defaultColor || '#ccc' }}>
                    {meta?.name || sId}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      current.periodRange === 'all_day'
                        ? 'bg-purple-950 text-purple-300 border border-purple-500/50'
                        : 'bg-[#222] text-[#888]'
                    }`}
                  >
                    {current.periodRange === 'all_day' ? 'يوم كامل فارغ' : current.periodRange === 'morning' ? 'صباحاً' : 'مساءً'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div>
                    <label className="text-[10px] text-[#777] block mb-0.5">اليوم:</label>
                    <select
                      value={current.day}
                      onChange={(e) => {
                        const updated = {
                          ...subjectDays,
                          [sId]: { ...current, day: e.target.value },
                        };
                        handleSavePedagogicalDays(updated);
                      }}
                      className="w-full p-1.5 bg-[#1a1a1a] border border-[#333] rounded text-white text-xs font-semibold outline-hidden focus:border-[#c084fc]"
                    >
                      {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'].map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#777] block mb-0.5">الفترة:</label>
                    <select
                      value={current.periodRange}
                      onChange={(e) => {
                        const updated = {
                          ...subjectDays,
                          [sId]: {
                            ...current,
                            periodRange: e.target.value as 'morning' | 'afternoon' | 'all_day',
                          },
                        };
                        handleSavePedagogicalDays(updated);
                      }}
                      className="w-full p-1.5 bg-[#1a1a1a] border border-[#333] rounded text-white text-xs font-semibold outline-hidden focus:border-[#c084fc]"
                    >
                      <option value="all_day">يوم كامل فارغ كلياً (1-8)</option>
                      <option value="morning">نصف يوم: صباحاً (1-4)</option>
                      <option value="afternoon">نصف يوم: مساءً (5-8)</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Remedial Classes & Teacher Comfort Directives */}
      <div className="bg-[#0e0e0e] border border-[#222] rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#181818] border border-[#333] flex items-center justify-center text-[#f59e0b] font-bold">
              🎯
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                <span>تخصيص حصص الاستدراك والدعم التربوي (+1 سا لكل مادة أساسية)</span>
              </h2>
              <p className="text-[11px] text-[#888]">
                إضافة ساعة استدراك أسبوعية للمواد الأساسية لرفع مستوى التحصيل دون إرهاق التلميذ والأستاذ
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-[#1c1708] border border-amber-500/40 px-3.5 py-1.5 rounded-xl">
            <input
              type="checkbox"
              checked={enableRemedial}
              onChange={(e) => setEnableRemedial(e.target.checked)}
              className="accent-[#d4af37] w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-bold text-amber-300">
              تفعيل حصص الاستدراك الأسبوعية
            </span>
          </label>
        </div>

        {enableRemedial && (
          <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#aaa] mb-1">
                  اليوم المفضل لحصص الاستدراك:
                </label>
                <select
                  value={remedialDay}
                  onChange={(e) => setRemedialDay(e.target.value)}
                  className="w-full p-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-white text-xs font-bold outline-hidden focus:border-[#d4af37]"
                >
                  {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'].map((d) => (
                    <option key={d} value={d}>
                      {d} (الحصص الأخيرة المخصصة للدعم والاستدراك)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#aaa] mb-1">
                  المواد الأساسية المشمولة بالاستدراك:
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { id: 'arabic', name: 'اللغة العربية' },
                    { id: 'math', name: 'الرياضيات' },
                    { id: 'french', name: 'اللغة الفرنسية' },
                    { id: 'english', name: 'اللغة الإنجليزية' },
                    { id: 'science', name: 'العلوم الطبيعية' },
                    { id: 'physics', name: 'العلوم الفيزيائية' },
                  ].map((sub) => {
                    const isSelected = selectedRemedialSubjects.includes(sub.id as SubjectId);
                    return (
                      <button
                        type="button"
                        key={sub.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedRemedialSubjects(selectedRemedialSubjects.filter((s) => s !== sub.id));
                          } else {
                            setSelectedRemedialSubjects([...selectedRemedialSubjects, sub.id as SubjectId]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-950/70 text-amber-300 border border-amber-500/50 shadow'
                            : 'bg-[#1c1c1c] text-[#777] border border-[#333]'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {sub.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Teacher Comfort & Annex Commute Optimization Directive */}
        <div className="p-4 bg-gradient-to-r from-[#141a24] to-[#121212] border border-[#38bdf8]/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#38bdf8]" />
              <span className="text-xs font-extrabold text-white">
                خيار التوليد الذكي: مراعاة راحة الأستاذ وتقليل التنقل إلى الملحقة
              </span>
            </div>
            <p className="text-[11px] text-[#aaa] leading-relaxed max-w-2xl">
              عند تفعيله: يقوم محرك الخوارزميات بحصر حصص الأستاذ في الملحقة في نفس نصف اليوم (صباح أو مساء)،
              وتفادي التنقل بين المقر والملحقة في نفس الفترة، مع تقليص الفراغات البينية (النوافذ) وتفادي إسناد أكثر من 3 ساعات متتالية مرهقة.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-[#0f172a] border border-[#38bdf8]/50 px-3.5 py-2 rounded-xl shrink-0">
            <input
              type="checkbox"
              checked={prioritizeTeacherComfort}
              onChange={(e) => setPrioritizeTeacherComfort(e.target.checked)}
              className="accent-[#38bdf8] w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-bold text-[#38bdf8]">
              تفعيل راحة الأستاذ والملحقة
            </span>
          </label>
        </div>

        {/* Ban 15:00-16:00 (Period 7) for Normal Lessons Directive */}
        <div className="p-4 bg-gradient-to-r from-[#201014] to-[#121212] border border-[#f87171]/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#f87171]" />
              <span className="text-xs font-extrabold text-white">
                حظر الحصة 7 (15:00 - 16:00) على الدروس العادية وحصرها حصرياً للاستدراك
              </span>
              <span className="px-2 py-0.5 bg-red-950/80 text-red-300 border border-red-500/40 rounded-full text-[10px] font-bold">
                مطلب بيداغوجي إلزامي
              </span>
            </div>
            <p className="text-[11px] text-[#aaa] leading-relaxed max-w-2xl">
              تنتهي الدروس النظامية لجميع الأقسام على الساعة 15:00 (الحصة 6 كحد أقصى).
              تُحظر الحصة من 15:00 إلى 16:00 (الحصة 7) وما بعدها على الدروس العادية وتُخصص حصرياً لساعة الاستدراك والدعم التربوي لمنع إرهاق الأساتذة والتلاميذ.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-[#2a0e14] border border-[#f87171]/50 px-3.5 py-2 rounded-xl shrink-0">
            <input
              type="checkbox"
              checked={restrictPeriod7ToRemedial}
              onChange={(e) => setRestrictPeriod7ToRemedial(e.target.checked)}
              className="accent-[#f87171] w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-bold text-[#f87171]">
              حظر 15:00-16:00 إلا للاستدراك
            </span>
          </label>
        </div>
      </div>

      {/* Step 3: Teacher Entry and Class Assignment */}
      <div className="bg-[#0e0e0e] border border-[#222] rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#181818] border border-[#333] flex items-center justify-center text-[#38bdf8] font-bold">
              3
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                <span>إدخال الأساتذة وإسناد الأقسام وحساب الساعات الكلية</span>
              </h2>
              <p className="text-[11px] text-[#888]">
                اكتب اسم الأستاذ، اختر المادة والأقسام المسندة — يحسب النظام ساعاته الكلية فوراً بدون أي أسماء وهمية مسبقة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleQuickCreateStructuralPositions}
              className="px-3 py-1.5 bg-[#141b24] hover:bg-[#1a2533] text-[#38bdf8] border border-[#38bdf8]/40 text-xs font-bold rounded-xl cursor-pointer transition-all"
              title="توليد مناصب المواد دون أسماء أشخاص وهمية"
            >
              ⚡ توليد مناصب المواد تلقائياً
            </button>
            {teachers.length > 0 && (
              <button
                onClick={handleClearAllTeachers}
                className="px-3 py-1.5 bg-[#241414] hover:bg-[#331a1a] text-red-400 border border-red-500/40 text-xs font-bold rounded-xl cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Input Form Card */}
        <form
          onSubmit={handleSaveTeacher}
          className="p-4 bg-[#141414] border border-[#282828] rounded-2xl space-y-4 shadow-inner"
        >
          <div className="font-bold text-xs text-[#d4af37] flex items-center justify-between">
            <span>{editingTeacherId ? '✏️ تعديل بيانات الأستاذ' : '➕ إضافة أستاذ جديد'}</span>
            {editingTeacherId && (
              <button
                type="button"
                onClick={() => {
                  setEditingTeacherId(null);
                  setTeacherName('');
                  setTeacherAssignedClasses([]);
                }}
                className="text-xs text-[#888] hover:text-white underline cursor-pointer"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#aaa] mb-1">
                اسم ولقب الأستاذ:
              </label>
              <input
                type="text"
                required
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="اكتب اسم الأستاذ (مثال: أ. بن عيسى)..."
                className="w-full p-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-xs font-bold focus:border-[#d4af37] outline-hidden placeholder-[#555]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#aaa] mb-1">
                المادة التعليمية:
              </label>
              <select
                value={teacherSubject}
                onChange={(e) => setTeacherSubject(e.target.value as SubjectId)}
                className="w-full p-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-xs font-bold focus:border-[#d4af37] outline-hidden"
              >
                {Object.entries(SUBJECT_METADATA).map(([sId, meta]) => (
                  <option key={sId} value={sId}>
                    {meta.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#aaa] mb-1">
                اليوم البيداغوجي للأستاذ:
              </label>
              <select
                value={teacherPedDay}
                onChange={(e) => setTeacherPedDay(e.target.value)}
                className="w-full p-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-xs font-bold focus:border-[#c084fc] outline-hidden"
              >
                {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#aaa] mb-1">
                فترة التفريغ البيداغوجي:
              </label>
              <select
                value={teacherPedRange}
                onChange={(e) => setTeacherPedRange(e.target.value as 'morning' | 'afternoon' | 'all_day')}
                className="w-full p-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-xs font-bold focus:border-[#c084fc] outline-hidden"
              >
                <option value="all_day">🌟 يوم كامل فارغ كلياً (1-8)</option>
                <option value="morning">نصف يوم: صباحاً (1-4)</option>
                <option value="afternoon">نصف يوم: مساءً (5-8)</option>
              </select>
            </div>
          </div>

          {/* Assigned Classes Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#aaa] mb-1.5 flex items-center justify-between">
              <span>إسناد الأقسام للأستاذ (انقر لتحديد أو إلغاء القسم):</span>
              <span className="text-[11px] text-[#d4af37] font-bold">
                المحدد: {teacherAssignedClasses.length} أقسام
              </span>
            </label>

            <div className="flex flex-wrap gap-1.5 p-3 bg-[#181818] border border-[#2a2a2a] rounded-xl max-h-32 overflow-y-auto">
              {classes.map((cls) => {
                const isSelected = teacherAssignedClasses.includes(cls.id);
                const isAnnex = annexClassIds.includes(cls.id);
                return (
                  <button
                    type="button"
                    key={cls.id}
                    onClick={() => toggleTeacherClass(cls.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#d4af37] text-black shadow-md scale-105'
                        : 'bg-[#222] text-[#aaa] hover:bg-[#2c2c2c] hover:text-white'
                    }`}
                  >
                    <span>{cls.name}</span>
                    {isAnnex && <span className="text-[9px] bg-purple-900 text-purple-200 px-1 rounded">ملحقة</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workload calculation & Submit */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#262626]">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-xs text-[#aaa]">
                الساعات الكلية المحسوبة للأستاذ:{' '}
                <strong className="text-white text-sm font-bold">
                  {calculatedTeachingHours} سا أسبوعياً
                </strong>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#888]">
                <span>النصاب القانوني:</span>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={teacherMaxHours}
                  onChange={(e) => setTeacherMaxHours(Number(e.target.value))}
                  className="w-16 p-1 bg-[#1a1a1a] border border-[#333] rounded text-white text-center font-bold text-xs"
                />
                <span>سا</span>
              </div>

              {calculatedTeachingHours === teacherMaxHours ? (
                <span className="px-2 py-0.5 bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 rounded text-[11px] font-bold">
                  ✓ نصاب مكتمل
                </span>
              ) : calculatedTeachingHours < teacherMaxHours ? (
                <span className="px-2 py-0.5 bg-amber-950/50 text-amber-300 border border-amber-500/40 rounded text-[11px]">
                  ساعات شاغرة: {teacherMaxHours - calculatedTeachingHours} سا
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-red-950/50 text-red-300 border border-red-500/40 rounded text-[11px]">
                  ساعات إضافية: +{calculatedTeachingHours - teacherMaxHours} سا
                </span>
              )}
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black font-extrabold text-xs rounded-xl shadow-lg cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{editingTeacherId ? 'حفظ تعديل الأستاذ' : 'حفظ وإضافة الأستاذ'}</span>
            </button>
          </div>
        </form>

        {/* Teachers Roster List */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-[#aaa] flex items-center justify-between">
            <span>قائمة الأساتذة المسجلين بالمؤسسة ({teachers.length} أستاذ):</span>
            <span className="text-[11px] text-[#666]">
              يمكنك التعديل أو الحذف بنقرة واحدة
            </span>
          </div>

          {teachers.length === 0 ? (
            <div className="p-8 text-center bg-[#121212] border border-dashed border-[#262626] rounded-xl text-xs text-[#777] space-y-2">
              <Users className="w-8 h-8 mx-auto opacity-30 text-[#d4af37]" />
              <div>لا توجد أسماء أساتذة بعد. قم بإدخال أساتذتك أعلاه أو اضغط "توليد مناصب المواد تلقائياً".</div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#222] rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#121212] text-[#888] font-bold border-b border-[#222]">
                  <tr>
                    <th className="p-3">الأستاذ</th>
                    <th className="p-3">المادة</th>
                    <th className="p-3">الأقسام المسندة</th>
                    <th className="p-3 text-center">الساعات الكلية / النصاب</th>
                    <th className="p-3 text-center">اليوم البيداغوجي</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {teachers.map((t) => {
                    const meta = SUBJECT_METADATA[t.subjectId];
                    let calculated = 0;
                    t.assignedClassIds.forEach((cId) => {
                      const cls = classes.find((c) => c.id === cId);
                      if (cls) {
                        const rule = rules.find((r) => r.subject_id === t.subjectId && r.level === cls.level);
                        calculated += rule ? rule.weekly_hours : 4;
                      }
                    });

                    const hasAnnex = t.assignedClassIds.some((cId) => annexClassIds.includes(cId));
                    const isAllDayPed = t.pedagogicalPeriodRange === 'all_day';

                    return (
                      <tr key={t.id} className="hover:bg-[#141414]">
                        <td className="p-3 font-bold text-white flex items-center gap-1.5">
                          <span>{t.name}</span>
                          {hasAnnex && (
                            <span className="text-[9px] bg-purple-900/60 text-purple-300 border border-purple-400/40 px-1 py-0.5 rounded font-normal">
                              يدرس بالملحقة 🏢
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className="px-2 py-0.5 rounded font-bold text-[11px]"
                            style={{
                              backgroundColor: `${meta?.defaultColor}20`,
                              color: meta?.defaultColor || '#ccc',
                              border: `1px solid ${meta?.defaultColor}40`,
                            }}
                          >
                            {meta?.name || t.subjectId}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {t.assignedClassIds.length > 0 ? (
                              t.assignedClassIds.map((cId) => {
                                const cls = classes.find((c) => c.id === cId);
                                const isAnn = annexClassIds.includes(cId);
                                return (
                                  <span
                                    key={cId}
                                    className={`px-1.5 py-0.5 border rounded text-[10px] ${
                                      isAnn
                                        ? 'bg-purple-950 text-purple-300 border-purple-500/50 font-bold'
                                        : 'bg-[#1c1c1c] text-[#ccc] border-[#2c2c2c]'
                                    }`}
                                  >
                                    {cls?.name || cId} {isAnn && '🏢'}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[#555] italic text-[10px]">
                                لم تسند له أقسام بعد
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold">
                          <span className="text-white">{calculated} سا</span>
                          <span className="text-[#666] text-[10px] font-normal">
                            {' '}
                            / {t.maxWeeklyHours} سا
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isAllDayPed
                                ? 'bg-purple-900/80 text-purple-200 border border-purple-400 shadow-xs'
                                : 'bg-[#1c142b] text-[#c084fc] border border-[#c084fc]/30'
                            }`}
                          >
                            {t.pedagogicalDay || 'الثلاثاء'} (
                            {isAllDayPed
                              ? 'يوم كامل فارغ كلياً 🌟'
                              : t.pedagogicalPeriodRange === 'morning'
                              ? 'صباحاً'
                              : 'مساءً'}
                            )
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleStartEditTeacher(t)}
                              className="p-1 text-[#888] hover:text-[#d4af37] rounded cursor-pointer"
                              title="تعديل"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeacher(t.id)}
                              className="p-1 text-[#888] hover:text-red-400 rounded cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Step 4: Final Generation CTA & AI Frank Critique Options */}
      <div className="p-8 bg-gradient-to-b from-[#181308] to-[#0c0c0c] border-2 border-[#d4af37] rounded-3xl text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-[#241a08] border border-[#d4af37] flex items-center justify-center mx-auto text-[#d4af37] shadow-lg">
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg md:text-xl font-extrabold text-white">
            جاهز لتوليد واستخراج استعمال الزمن الشامل للمؤسسة
          </h3>
          <p className="text-xs text-[#aaa] max-w-xl mx-auto leading-relaxed">
            سيقوم المحرك الآلي DALI CSP بتوزيع الحصص الأسبوعية وتطبيق الأيام البيداغوجية (يوم كامل أو نصف يوم)،
            وتفويج حصتي العربية والرياضيات (1 سا كاملة لكل منهما بنظام التبادل)، وتسهيل تنقل أساتذة الملحقة وتقليل تنقلهم لأدنى حد.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => handleTriggerGeneration(prioritizeTeacherComfort)}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#d4af37] via-[#e5c055] to-[#c59e2e] hover:from-[#e5c055] hover:to-[#b38f20] text-black font-extrabold text-sm md:text-base rounded-2xl shadow-2xl transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>⚡ اضغط هنا لبدء التوليد الآلي الشامل</span>
          </button>

          <button
            onClick={() => handleTriggerGeneration(true)}
            className="flex items-center gap-2 px-6 py-4 bg-[#141d26] hover:bg-[#1a2734] text-[#38bdf8] border border-[#38bdf8]/50 font-bold text-xs md:text-sm rounded-2xl cursor-pointer transition-all active:scale-95"
            title="توليد خيار آخر يركز بنسبة 100% على راحة الأستاذ وتقليل التنقل إلى الملحقة"
          >
            <Heart className="w-4 h-4 text-[#38bdf8]" />
            <span>🔄 توليد خيار آخر بمراعاة راحة الأستاذ والملحقة</span>
          </button>
        </div>

        {slots.length > 0 && (
          <div className="pt-3 border-t border-[#222] flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleOpenAiCritique}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#1c142b] hover:bg-[#281c3d] text-[#c084fc] border border-[#c084fc]/50 font-bold text-xs rounded-xl cursor-pointer transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>🤖 طلب رأي الذكاء الاصطناعي بصراحة في هذا التوليد</span>
            </button>

            <button
              onClick={() => handleSaveCurrentVersion()}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#1a261a] hover:bg-[#233523] text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-xl cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>💾 حفظ هذا التوليد كجدول معتمد بالسجل</span>
            </button>
          </div>
        )}
      </div>

      {/* Saved Versions History Drawer */}
      {savedVersions.length > 0 && (
        <div className="bg-[#0e0e0e] border border-[#222] rounded-2xl p-6 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#d4af37]" />
              <h3 className="text-sm font-bold text-white">
                سجل النسخ المحفوظة والمعتمدة للمؤسسة ({savedVersions.length} نسخ):
              </h3>
            </div>
            <span className="text-[11px] text-[#888]">
              يمكنك استرجاع أي جدول محفوظ بنقرة واحدة
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {savedVersions.map((v) => (
              <div
                key={v.id}
                className="p-3 bg-[#141414] border border-[#262626] rounded-xl space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-white truncate" title={v.name}>
                    {v.name}
                  </div>
                  <div className="text-[10px] text-[#888] mt-0.5">
                    {new Date(v.createdAt).toLocaleDateString('ar-DZ')} • {v.slotsCount} حصة
                  </div>
                  {v.notes && (
                    <p className="text-[10px] text-[#aaa] mt-1 line-clamp-2 leading-relaxed">
                      {v.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#222]">
                  {onRestoreVersion && (
                    <button
                      onClick={() => onRestoreVersion(v)}
                      className="px-3 py-1 bg-[#1a1408] text-[#d4af37] border border-[#d4af37]/40 rounded-lg text-xs font-bold hover:bg-[#d4af37] hover:text-black cursor-pointer transition-all"
                    >
                      استرجاع وتفعيل
                    </button>
                  )}
                  {onDeleteVersion && (
                    <button
                      onClick={() => onDeleteVersion(v.id)}
                      className="p-1 text-[#666] hover:text-red-400 cursor-pointer"
                      title="حذف النسخة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Candid Critique Modal */}
      <AiCritiqueModal
        isOpen={showCritiqueModal}
        onClose={() => setShowCritiqueModal(false)}
        critique={critiqueData}
        isLoading={isCritiqueLoading}
        onSaveVersion={(name, notes) => handleSaveCurrentVersion(name, notes)}
        onRegenerateWithComfort={() => handleTriggerGeneration(true)}
        onNavigateToTimetables={onNavigateToTimetables}
      />
    </div>
  );
};
