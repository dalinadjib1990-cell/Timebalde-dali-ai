import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Grid,
  User,
  GraduationCap,
  DoorClosed,
  Layers,
  Sparkles,
  MoveHorizontal,
  Printer,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Filter,
  RefreshCw,
  Clock,
  Plus,
  Trash2,
  Save,
  X,
  Mic,
  Scale,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  TimetableSlot,
  SchoolClass,
  Teacher,
  Room,
  SubjectRule,
  InstitutionConfig,
  Conflict,
  SubjectId,
} from '../types';
import { SUBJECT_METADATA } from '../data/officialData';
import { SubjectIcon } from './SubjectIcon';
import { printElement, exportTimetableToExcel, exportTimetableToWord } from '../services/exportService';
import { PedagogicalDaysModal } from './PedagogicalDaysModal';
import { OfficialLegalSubjectsTableModal } from './OfficialLegalSubjectsTableModal';

interface Props {
  slots: TimetableSlot[];
  classes: SchoolClass[];
  teachers: Teacher[];
  rooms: Room[];
  rules: SubjectRule[];
  config: InstitutionConfig;
  conflicts: Conflict[];
  onMoveSlot: (slotId: string, targetDay: string, targetPeriod: number) => void;
  onAutoRebalance: (targetClassId?: string, targetTeacherId?: string) => void;
  onAddSlot?: (newSlot: Omit<TimetableSlot, 'id'>) => void;
  onDeleteSlot?: (slotId: string) => void;
  onClearAllSlots?: () => void;
  onGenerateFreshTimetable?: () => void;
  onUpdateTeachersAndConfig?: (updatedTeachers: Teacher[], updatedConfig: InstitutionConfig) => void;
  onSaveVersion?: (name?: string, notes?: string) => void;
  onOpenVoiceAssistant?: () => void;
}

type ViewMode = 'class' | 'teacher' | 'room' | 'master' | 'td_tp';

export const TimetablesView: React.FC<Props> = ({
  slots,
  classes,
  teachers,
  rooms,
  rules,
  config,
  conflicts,
  onMoveSlot,
  onAutoRebalance,
  onAddSlot,
  onDeleteSlot,
  onClearAllSlots,
  onGenerateFreshTimetable,
  onUpdateTeachersAndConfig,
  onSaveVersion,
  onOpenVoiceAssistant,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '1am1');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || 't-ar-1');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || 'room-01');

  // Modals for AI Pedagogical Days & Legal Table
  const [showPedagogicalModal, setShowPedagogicalModal] = useState(false);
  const [showLegalTableModal, setShowLegalTableModal] = useState(false);
  const [showClassLegalTracker, setShowClassLegalTracker] = useState(true);

  // Slot Movement State (Click to pick -> Click to drop)
  const [selectedMovingSlot, setSelectedMovingSlot] = useState<TimetableSlot | null>(null);

  // Manual Add Slot Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSlotDay, setNewSlotDay] = useState('الأحد');
  const [newSlotPeriod, setNewSlotPeriod] = useState(1);
  const [newSlotClassId, setNewSlotClassId] = useState(classes[0]?.id || '1am1');
  const [newSlotSubjectId, setNewSlotSubjectId] = useState<SubjectId>('math');
  const [newSlotTeacherId, setNewSlotTeacherId] = useState(teachers[0]?.id || '');
  const [newSlotRoomId, setNewSlotRoomId] = useState(rooms[0]?.id || '');
  const [newSlotType, setNewSlotType] = useState<'course' | 'td' | 'tp' | 'sport'>('course');

  const teacherMap = new Map<string, Teacher>(teachers.map((t) => [t.id, t]));
  const classMap = new Map<string, SchoolClass>(classes.map((c) => [c.id, c]));
  const roomMap = new Map<string, Room>(rooms.map((r) => [r.id, r]));

  const days = config.days;
  const periods = config.periods;

  // Filter slots for current view
  const currentClass = classMap.get(selectedClassId);
  const currentTeacher = teacherMap.get(selectedTeacherId);
  const currentRoom = roomMap.get(selectedRoomId);

  // Legal requirements calculation for active class in class view
  const classLegalBreakdown = useMemo(() => {
    if (!currentClass) return [];
    const classLevel = currentClass.level;
    const classRules = rules.filter((r) => r.level === classLevel);

    const order: SubjectId[] = [
      'arabic',
      'math',
      'french',
      'english',
      'science',
      'physics',
      'history',
      'geography',
      'islamic',
      'civic',
      'pe',
      'art_music',
      'computer',
    ];

    return order
      .map((sId) => {
        const meta = SUBJECT_METADATA[sId];
        const rule = classRules.find((r) => r.subject_id === sId);
        const scheduledCount = slots.filter(
          (s) => s.classId === selectedClassId && s.subjectId === sId
        ).length;
        const requiredHours = rule ? rule.weekly_hours : 0;
        const hasTd = rule && rule.td_required;
        const hasTp = rule && rule.tp_required;

        return {
          subjectId: sId,
          name: meta?.name || sId,
          color: meta?.defaultColor || '#d4af37',
          requiredHours,
          scheduledCount,
          hasTd,
          hasTp,
          status:
            scheduledCount === requiredHours
              ? 'matched'
              : scheduledCount > requiredHours
              ? 'over'
              : 'under',
          remaining: requiredHours - scheduledCount,
        };
      })
      .filter((item) => item.requiredHours > 0);
  }, [currentClass, rules, slots, selectedClassId]);

  const totalClassScheduled = slots.filter((s) => s.classId === selectedClassId).length;
  const totalClassRequired = classLegalBreakdown.reduce((sum, item) => sum + item.requiredHours, 0);

  const handleSelectSubjectForNewSlot = (subjId: SubjectId) => {
    setNewSlotSubjectId(subjId);
    // Find candidate teacher assigned to this class for this subject
    const candidateTeacher =
      teachers.find((t) => t.subjectId === subjId && t.assignedClassIds.includes(newSlotClassId)) ||
      teachers.find((t) => t.subjectId === subjId);
    if (candidateTeacher) {
      setNewSlotTeacherId(candidateTeacher.id);
    }
    // Auto-select room based on subject requirements
    if (subjId === 'science') {
      const sciRoom = rooms.find((r) => r.type === 'science_lab');
      if (sciRoom) setNewSlotRoomId(sciRoom.id);
    } else if (subjId === 'physics') {
      const phyRoom = rooms.find((r) => r.type === 'physics_lab');
      if (phyRoom) setNewSlotRoomId(phyRoom.id);
    } else if (subjId === 'computer') {
      const compRoom = rooms.find((r) => r.type === 'computer_lab');
      if (compRoom) setNewSlotRoomId(compRoom.id);
    } else if (subjId === 'pe') {
      const sportRoom = rooms.find((r) => r.type === 'sports_ground');
      if (sportRoom) setNewSlotRoomId(sportRoom.id);
    } else if (subjId === 'art_music') {
      const artRoom = rooms.find((r) => r.type === 'art_room');
      if (artRoom) setNewSlotRoomId(artRoom.id);
    } else {
      const targetClass = classMap.get(newSlotClassId);
      if (targetClass?.assignedRoomId) {
        setNewSlotRoomId(targetClass.assignedRoomId);
      }
    }
  };

  const handleSlotClick = (slot: TimetableSlot) => {
    if (selectedMovingSlot?.id === slot.id) {
      setSelectedMovingSlot(null);
    } else {
      setSelectedMovingSlot(slot);
    }
  };

  const handleCellTargetClick = (day: string, period: number) => {
    if (selectedMovingSlot) {
      onMoveSlot(selectedMovingSlot.id, day, period);
      setSelectedMovingSlot(null);
    } else {
      // Open manual add modal for this cell
      setNewSlotDay(day);
      setNewSlotPeriod(period);
      if (viewMode === 'class') {
        setNewSlotClassId(selectedClassId);
      }
      if (viewMode === 'teacher') {
        setNewSlotTeacherId(selectedTeacherId);
        if (currentTeacher) {
          setNewSlotSubjectId(currentTeacher.subjectId);
          if (currentTeacher.assignedClassIds.length > 0) {
            setNewSlotClassId(currentTeacher.assignedClassIds[0]);
          }
        }
      }
      if (viewMode === 'room') {
        setNewSlotRoomId(selectedRoomId);
      }
      setShowAddModal(true);
    }
  };

  const handleClearSingleTeacherSlots = (tId: string) => {
    if (!onDeleteSlot) return;
    if (window.confirm(`هل تريد تفريغ كافة حصص هذا الأستاذ (${currentTeacher?.name}) لإعادة ملء جدوله يدوياً؟`)) {
      const teacherSlots = slots.filter((s) => s.teacherId === tId);
      teacherSlots.forEach((s) => onDeleteSlot(s.id));
    }
  };

  const handleConfirmAddSlot = () => {
    if (onAddSlot) {
      onAddSlot({
        classId: newSlotClassId,
        subjectId: newSlotSubjectId,
        teacherId: newSlotTeacherId,
        roomId: newSlotRoomId,
        day: newSlotDay,
        period: newSlotPeriod,
        type: newSlotType,
      });
      setShowAddModal(false);
    }
  };

  const handlePrint = () => {
    printElement('printable-timetable-container');
  };

  const handleExportExcel = () => {
    exportTimetableToExcel(slots, teachers, classes, rooms, rules, config);
  };

  const handleExportWord = () => {
    const el = document.getElementById('printable-timetable-container');
    if (!el) return;
    const title =
      viewMode === 'class'
        ? `جدول توقيت الفوج ${currentClass?.name}`
        : viewMode === 'teacher'
        ? `جدول توقيت الأستاذ ${currentTeacher?.name}`
        : viewMode === 'room'
        ? `جدول توقيت القاعة ${currentRoom?.name}`
        : 'استعمال الزمن العام للمؤسسة';

    exportTimetableToWord(title, el.innerHTML, config.name);
  };

  return (
    <div id="timetables-view" className="space-y-6">
      {/* View Switcher & Action Bar */}
      <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-[#222] shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* View Mode Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
          <button
            onClick={() => setViewMode('class')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'class'
                ? 'bg-[#161616] text-[#d4af37] border border-[#d4af37]/40 shadow-[0_0_10px_rgba(212,175,55,0.12)]'
                : 'bg-[#111] text-[#888] hover:bg-[#181818] hover:text-white border border-[#222]'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-[#d4af37]" />
            <span>جدول القسم (الفوج)</span>
          </button>

          <button
            onClick={() => setViewMode('teacher')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'teacher'
                ? 'bg-[#161616] text-[#d4af37] border border-[#d4af37]/40 shadow-[0_0_10px_rgba(212,175,55,0.12)]'
                : 'bg-[#111] text-[#888] hover:bg-[#181818] hover:text-white border border-[#222]'
            }`}
          >
            <User className="w-4 h-4 text-[#d4af37]" />
            <span>جدول الأستاذ</span>
          </button>

          <button
            onClick={() => setViewMode('room')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'room'
                ? 'bg-[#161616] text-[#d4af37] border border-[#d4af37]/40 shadow-[0_0_10px_rgba(212,175,55,0.12)]'
                : 'bg-[#111] text-[#888] hover:bg-[#181818] hover:text-white border border-[#222]'
            }`}
          >
            <DoorClosed className="w-4 h-4 text-[#d4af37]" />
            <span>جدول القاعة / المخبر</span>
          </button>

          <button
            onClick={() => setViewMode('master')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'master'
                ? 'bg-[#161616] text-[#d4af37] border border-[#d4af37]/40 shadow-[0_0_10px_rgba(212,175,55,0.12)]'
                : 'bg-[#111] text-[#888] hover:bg-[#181818] hover:text-white border border-[#222]'
            }`}
          >
            <Grid className="w-4 h-4 text-[#d4af37]" />
            <span>الجدول العام الشامل</span>
          </button>

          <button
            onClick={() => setViewMode('td_tp')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'td_tp'
                ? 'bg-[#161616] text-[#d4af37] border border-[#d4af37]/40 shadow-[0_0_10px_rgba(212,175,55,0.12)]'
                : 'bg-[#111] text-[#888] hover:bg-[#181818] hover:text-white border border-[#222]'
            }`}
          >
            <Layers className="w-4 h-4 text-[#d4af37]" />
            <span>حصص TD و TP</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
          {/* Clear Timetables for Pure Manual Mode */}
          {onClearAllSlots && (
            <button
              id="clear-timetables-btn"
              onClick={() => {
                if (window.confirm('هل تود تفريغ جميع الجداول واستعمالات الزمن لبدء الملء اليدوي الكامل للسيد المدير؟')) {
                  onClearAllSlots();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#2a1010] hover:bg-[#3a1515] text-[#f87171] border border-[#f87171]/40 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="تفريغ جميع الجداول لبدء عملية الإسناد والملء اليدوي الكامل للمدير"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#f87171]" />
              <span>تفريغ الجداول (ملء يدوي)</span>
            </button>
          )}

          {/* AI Pedagogical Days Assigner */}
          <button
            id="pedagogical-days-ai-btn"
            onClick={() => setShowPedagogicalModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1c142b] hover:bg-[#281c3d] text-[#c084fc] border border-[#c084fc]/50 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="تحديد وتوزيع الأيام البيداغوجية لهيئة التدريس بالذكاء الاصطناعي"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#c084fc]" />
            <span>الأيام البيداغوجية (AI)</span>
          </button>

          {/* Official Ministerial Legal Table */}
          <button
            id="official-legal-table-btn"
            onClick={() => setShowLegalTableModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#141b14] hover:bg-[#1f2b1f] text-[#4ade80] border border-[#4ade80]/40 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="عرض جدول الحصص والأنصبة الأسبوعية المعتمدة بالمنشور الوزاري"
          >
            <Scale className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>جدول الحصص القانونية</span>
          </button>

          {/* Smart Auto-Generate Timetable */}
          {onGenerateFreshTimetable && (
            <button
              onClick={() => {
                if (slots.length > 0 && !window.confirm('هل تود استبدال الجدول الحالي بتوليد آلي ذكي جديد؟')) {
                  return;
                }
                onGenerateFreshTimetable();
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#121d2a] hover:bg-[#1a2b3d] text-[#38bdf8] border border-[#38bdf8]/40 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="توليد آلي ذكي لجميع الأقسام وفق المنظومة الرسمية"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>توليد آلي ذكي</span>
            </button>
          )}

          {viewMode === 'class' && (
            <button
              onClick={() => onAutoRebalance(selectedClassId, undefined)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1a120a] hover:bg-[#261b0f] text-[#d4af37] border border-[#d4af37]/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="إعادة توزيع وحل حصص هذا القسم تلقائياً"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>موازنة الفوج</span>
            </button>
          )}

          {viewMode === 'teacher' && (
            <button
              onClick={() => onAutoRebalance(undefined, selectedTeacherId)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1a120a] hover:bg-[#261b0f] text-[#d4af37] border border-[#d4af37]/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="إعادة توزيع حصص هذا الأستاذ تلقائياً"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>موازنة الأستاذ</span>
            </button>
          )}

          {onOpenVoiceAssistant && (
            <button
              id="voice-control-timetable-btn"
              onClick={onOpenVoiceAssistant}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#d4af37]/20 to-[#b8972e]/20 hover:from-[#d4af37]/35 hover:to-[#b8972e]/35 text-[#d4af37] border border-[#d4af37]/60 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer animate-pulse hover:animate-none"
              title="التحكم الصوتي الفوري في الحصص: تحدث لتحريك ساعة أو تغييرها فوراً"
            >
              <Mic className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>🎙️ تحكم صوتي</span>
            </button>
          )}

          <button
            id="print-timetable-btn"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#161616] hover:bg-[#222] text-[#e0e0e0] border border-[#333] rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#aaa]" />
            <span>طباعة</span>
          </button>

          <button
            id="export-excel-btn"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1a2e1a] hover:bg-[#233d23] text-[#4ade80] border border-[#4ade80]/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>Excel</span>
          </button>

          <button
            id="export-word-btn"
            onClick={handleExportWord}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#0e1b2e] hover:bg-[#172b49] text-[#60a5fa] border border-[#60a5fa]/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#60a5fa]" />
            <span>Word</span>
          </button>
        </div>
      </div>

      {/* Dynamic Sub-Selector depending on mode */}
      <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-[#222] space-y-3 shadow-lg">
        {viewMode === 'class' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f1f1f] pb-3">
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                <span className="text-xs font-bold text-[#888] shrink-0">اختر القسم التربوي:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {classes.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => setSelectedClassId(cls.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedClassId === cls.id
                          ? 'bg-[#d4af37] text-black shadow-md'
                          : 'bg-[#141414] text-[#888] border border-[#222] hover:text-white hover:bg-[#1c1c1c]'
                      }`}
                    >
                      {cls.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="text-[#888]">
                  مجموع الساعات المسندة:{' '}
                  <strong className={totalClassScheduled >= 28 ? 'text-emerald-400' : 'text-[#d4af37]'}>
                    {totalClassScheduled} / 28.5 سا
                  </strong>
                </span>
                <button
                  onClick={() => setShowClassLegalTracker(!showClassLegalTracker)}
                  className="flex items-center gap-1 text-[11px] text-[#aaa] hover:text-[#d4af37] cursor-pointer"
                >
                  <span>{showClassLegalTracker ? 'إخفاء شريط متابعة المواد' : 'عرض شريط متابعة المواد'}</span>
                  {showClassLegalTracker ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Live Class Legal Hours Tracker: Subjects Checklist for the Principal */}
            {showClassLegalTracker && (
              <div className="p-3 bg-[#111] rounded-xl border border-[#222] space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#888]">
                  <span className="font-bold text-[#d4af37] flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>متابعة الحجم الساعي الأسبوعي لمستوى {currentClass?.level} (انقر على أي مادة لإسنادها):</span>
                  </span>
                  <span>المجموع القانوني الإلزامي: 28 ساعة و 30 دقيقة أسبوعياً</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {classLegalBreakdown.map((item) => {
                    const isComplete = item.status === 'matched';
                    const isOver = item.status === 'over';
                    return (
                      <div
                        key={item.subjectId}
                        onClick={() => {
                          setNewSlotClassId(selectedClassId);
                          handleSelectSubjectForNewSlot(item.subjectId);
                          setShowAddModal(true);
                        }}
                        className={`p-2 rounded-xl border transition-all cursor-pointer text-xs ${
                          isComplete
                            ? 'bg-[#122014] border-emerald-500/40 text-emerald-200 hover:border-emerald-400'
                            : isOver
                            ? 'bg-[#291212] border-red-500/40 text-red-200 hover:border-red-400'
                            : 'bg-[#181818] border-[#333] text-white hover:border-[#d4af37] hover:bg-[#1f1a10]'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                          <span className="truncate" style={{ color: item.color }}>
                            {item.name}
                          </span>
                          {isComplete ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : isOver ? (
                            <span className="text-[9px] text-red-400 font-bold shrink-0">+{item.scheduledCount - item.requiredHours}</span>
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-[#d4af37] opacity-60 hover:opacity-100 shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-[#aaa]">
                          <span>
                            {item.scheduledCount} / {item.requiredHours} سا
                          </span>
                          <span
                            className={
                              isComplete
                                ? 'text-emerald-400 font-bold'
                                : isOver
                                ? 'text-red-400 font-bold'
                                : 'text-[#d4af37]'
                            }
                          >
                            {isComplete
                              ? 'مكتمل'
                              : isOver
                              ? 'فائض'
                              : `متبقي ${item.remaining} سا`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === 'teacher' && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#888] shrink-0">اختر الأستاذ:</span>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="p-2 border border-[#333] rounded-xl text-xs bg-[#050505] text-[#e0e0e0] font-bold outline-hidden focus:border-[#d4af37]"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({SUBJECT_METADATA[t.subjectId]?.name || t.subjectId})
                  </option>
                ))}
              </select>
            </div>

            {currentTeacher && (
              <div className="flex flex-wrap items-center gap-3 text-xs bg-[#121212] p-2.5 rounded-xl border border-[#222]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#888]">المادة:</span>
                  <strong className="text-[#d4af37]">
                    {SUBJECT_METADATA[currentTeacher.subjectId]?.name}
                  </strong>
                </div>

                <span className="text-[#444]">|</span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[#888]">النصاب القانوني:</span>
                  <strong className="text-white">
                    {slots.filter((s) => s.teacherId === currentTeacher.id).length} / {currentTeacher.maxWeeklyHours || 18} سا
                  </strong>
                </div>

                <span className="text-[#444]">|</span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[#888]">الأقسام المسندة:</span>
                  <div className="flex items-center gap-1">
                    {currentTeacher.assignedClassIds.length > 0 ? (
                      currentTeacher.assignedClassIds.map((cId) => (
                        <span key={cId} className="px-1.5 py-0.5 bg-[#181818] text-[#d4af37] border border-[#333] rounded text-[10px] font-bold">
                          {classMap.get(cId)?.name || cId}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#666] italic text-[10px]">لا توجد أقسام مسندة</span>
                    )}
                  </div>
                </div>

                <span className="text-[#444]">|</span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[#888]">اليوم البيداغوجي (AI):</span>
                  {(() => {
                    const pDay = currentTeacher.pedagogicalDay || config.subjectPedagogicalDays?.[currentTeacher.subjectId]?.day || 'الثلاثاء';
                    const pRange = currentTeacher.pedagogicalPeriodRange || config.subjectPedagogicalDays?.[currentTeacher.subjectId]?.periodRange || 'morning';
                    return (
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        pRange === 'all_day'
                          ? 'bg-purple-950 text-purple-200 border border-purple-400'
                          : 'bg-[#1c142b] text-[#c084fc] border border-[#c084fc]/40'
                      }`}>
                        {pDay} ({pRange === 'all_day' ? 'يوم كامل فارغ كلياً 🌟' : pRange === 'afternoon' ? 'مساءً' : 'صباحاً'})
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2 mr-auto">
                  <button
                    onClick={() => {
                      setNewSlotDay('الأحد');
                      setNewSlotPeriod(1);
                      setNewSlotTeacherId(selectedTeacherId);
                      if (currentTeacher) {
                        setNewSlotSubjectId(currentTeacher.subjectId);
                        if (currentTeacher.assignedClassIds.length > 0) {
                          setNewSlotClassId(currentTeacher.assignedClassIds[0]);
                        }
                      }
                      setShowAddModal(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إسناد حصة للأستاذ</span>
                  </button>

                  <button
                    onClick={() => handleClearSingleTeacherSlots(selectedTeacherId)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-[#291212] hover:bg-[#3b1919] text-red-300 border border-red-500/40 font-bold text-xs rounded-xl cursor-pointer transition-all"
                    title="تفريغ جدول هذا الأستاذ فقط للبدء بالملء اليدوي"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تفريغ جدوله</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === 'room' && (
          <div className="flex items-center gap-2 overflow-x-auto w-full">
            <span className="text-xs font-bold text-[#888] shrink-0">اختر القاعة / المخبر:</span>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="p-2 border border-[#333] rounded-xl text-xs bg-[#050505] text-[#e0e0e0] font-bold outline-hidden focus:border-[#d4af37]"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.type === 'regular' ? 'قاعة عادية' : 'مخبر/ورشة'})
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedMovingSlot && (
          <div className="w-full p-2.5 bg-[#1a120a] border border-[#d4af37]/50 rounded-xl text-xs text-[#d4af37] flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <MoveHorizontal className="w-4 h-4 text-[#d4af37]" />
              <span>
                تم اختيار الحصة: (
                <strong className="text-white">
                  {SUBJECT_METADATA[selectedMovingSlot.subjectId]?.name} - يوم {selectedMovingSlot.day} الحصة {selectedMovingSlot.period}
                </strong>
                ) — اضغط على أي خلية فارغة لنقلها إليها.
              </span>
            </div>
            <button
              onClick={() => setSelectedMovingSlot(null)}
              className="px-2.5 py-1 bg-[#d4af37] text-black rounded-lg font-bold cursor-pointer hover:bg-[#c59e2e]"
            >
              إلغاء النقل
            </button>
          </div>
        )}
      </div>

      {/* Main Printable Timetable Canvas */}
      <div
        id="printable-timetable-container"
        className="bg-[#0a0a0a] rounded-2xl shadow-xl border border-[#222] overflow-hidden p-6 space-y-4 text-white"
      >
        {/* Printable Official Header */}
        <div className="border-b-2 border-[#d4af37]/40 pb-4 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-right">
          <div>
            <div className="text-xs font-bold text-[#888]">
              الجمهورية الجزائرية الديمقراطية الشعبية — وزارة التربية الوطنية
            </div>
            <h2 className="text-xl font-bold text-[#d4af37] mt-0.5">
              {config.name} ({config.academicYear})
            </h2>
            <div className="text-xs text-[#666]">
              {config.educationDirectorate} • مدير المؤسسة: {config.directorName}
            </div>
          </div>

          <div className="bg-[#141414] px-4 py-2 rounded-xl border border-[#222] text-center">
            <div className="text-xs text-[#d4af37] font-bold">
              {viewMode === 'class'
                ? `جدول توقيت الفوج: ${currentClass?.name || ''} (${currentClass?.level || ''})`
                : viewMode === 'teacher'
                ? `جدول توقيت: ${currentTeacher?.name || ''}`
                : viewMode === 'room'
                ? `جدول استعمال: ${currentRoom?.name || ''}`
                : viewMode === 'td_tp'
                ? 'جدول تنظيم حصص التفويج والمخابر (TD / TP)'
                : 'استعمال الزمن العام الشامل لجميع الأقسام'}
            </div>
            <div className="text-[11px] text-[#666] mt-0.5">
              مرجع المواقيت: ملحق القرار الوزاري 27 جويلية 2026
            </div>
          </div>
        </div>

        {/* Color Coding Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#0e0e0e] border border-[#222] rounded-xl text-xs">
          <div className="flex items-center gap-1.5 text-[#888] font-bold">
            <span>دليل الألوان والأنشطة:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-red-950/30 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-lg text-[11px] font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              <span>استدراك ودعم تربوي (أحمر)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-950/30 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-lg text-[11px] font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span>أعمال موجهة TD (أصفر)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-950/30 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-lg text-[11px] font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>أعمال تطبيقية TP علوم/تكنولوجيا (أخضر)</span>
            </div>
            {config.hasAnnex && (
              <div className="flex items-center gap-1.5 bg-purple-950/30 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                <span>🏢</span>
                <span>أقسام الملحقة (2AM4, 2AM5, 2AM6)</span>
              </div>
            )}
          </div>
        </div>

        {/* Timetable Grid Table (Class / Teacher / Room / TD-TP) */}
        {viewMode !== 'master' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse border border-[#222]">
              <thead>
                <tr className="bg-[#111] text-[#999] text-xs font-bold">
                  <th className="border border-[#222] p-2.5 w-24 bg-[#0d0d0d] text-[#aaa]">
                    اليوم / الحصة
                  </th>
                  {periods.map((p) => (
                    <th
                      key={p.id}
                      className={`border border-[#222] p-2 text-xs ${
                        p.id === 4 ? 'border-l-4 border-l-[#333]' : ''
                      }`}
                    >
                      <div className="font-bold text-[#e0e0e0] flex items-center justify-center gap-1">
                        <span>{p.name}</span>
                        {p.id === 7 && (
                          <span className="text-[9px] px-1 bg-red-950/80 text-red-300 border border-red-500/40 rounded font-bold">
                            استدراك
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#666] font-normal font-mono mt-0.5">
                        {p.timeRange}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => {
                  const isTuesdayAfternoon = config.tuesdayAfternoonOff && day === 'الثلاثاء';

                  return (
                    <tr key={day} className="border-b border-[#222]">
                      <td className="border border-[#222] p-3 bg-[#0d0d0d] font-bold text-[#d4af37] text-xs">
                        {day}
                      </td>

                      {periods.map((p) => {
                        const isAfternoonSlot = p.id >= 5;
                        if (isTuesdayAfternoon && isAfternoonSlot) {
                          if (p.id === 5) {
                            return (
                              <td
                                key={p.id}
                                colSpan={4}
                                className="border border-[#222] p-3 bg-[#080808] text-[#666] text-xs font-bold text-center italic"
                              >
                                🏖️ فترة تفريغ مخصصة للندوات التربوية والأنشطة الثقافية (مساء الثلاثاء)
                              </td>
                            );
                          }
                          return null;
                        }

                        // Get matching slots based on active view mode
                        let cellSlots: TimetableSlot[] = [];
                        if (viewMode === 'class') {
                          cellSlots = slots.filter(
                            (s) => s.classId === selectedClassId && s.day === day && s.period === p.id
                          );
                        } else if (viewMode === 'teacher') {
                          cellSlots = slots.filter(
                            (s) => s.teacherId === selectedTeacherId && s.day === day && s.period === p.id
                          );
                        } else if (viewMode === 'room') {
                          cellSlots = slots.filter(
                            (s) => s.roomId === selectedRoomId && s.day === day && s.period === p.id
                          );
                        } else if (viewMode === 'td_tp') {
                          cellSlots = slots.filter(
                            (s) => (s.type === 'td' || s.type === 'tp') && s.day === day && s.period === p.id
                          );
                        }

                        const teacherPedRange =
                          currentTeacher?.pedagogicalPeriodRange ||
                          config.subjectPedagogicalDays?.[currentTeacher?.subjectId || 'arabic']?.periodRange ||
                          'morning';

                        const isTeacherPedSlot =
                          viewMode === 'teacher' &&
                          currentTeacher &&
                          (currentTeacher.pedagogicalDay === day || config.subjectPedagogicalDays?.[currentTeacher.subjectId]?.day === day) &&
                          (teacherPedRange === 'all_day'
                            ? true
                            : teacherPedRange === 'afternoon'
                            ? p.id >= 5
                            : p.id <= 4);

                        return (
                          <td
                            key={p.id}
                            onClick={() => {
                              if (cellSlots.length === 0) {
                                handleCellTargetClick(day, p.id);
                              }
                            }}
                            className={`border border-[#222] p-1.5 min-w-[105px] h-20 align-top transition-all ${
                              p.id === 4 ? 'border-l-4 border-l-[#333]' : ''
                            } ${
                              isTeacherPedSlot && cellSlots.length === 0
                                ? 'bg-[#180f26] border-purple-500/30'
                                : selectedMovingSlot && cellSlots.length === 0
                                ? 'bg-[#1a120a]/80 hover:bg-[#261a0e] cursor-pointer border-dashed border-2 border-[#d4af37]'
                                : 'bg-[#050505] hover:bg-[#121212] cursor-pointer'
                            }`}
                          >
                            {cellSlots.length > 0 ? (
                              <div className="space-y-1">
                                {cellSlots.map((slot) => {
                                  const meta = SUBJECT_METADATA[slot.subjectId];
                                  const teacher = teacherMap.get(slot.teacherId);
                                  const cls = classMap.get(slot.classId);
                                  const room = roomMap.get(slot.roomId);
                                  const isSelected = selectedMovingSlot?.id === slot.id;
                                  const isRemedial = slot.type === 'remedial';
                                  const isTd = slot.type === 'td';
                                  const isTp = slot.type === 'tp';
                                  const isAnnex = slot.isAnnex || cls?.isAnnex || cls?.name?.includes('ملحقة');

                                  // User requested color coding:
                                  // Remedial: Red, TD: Yellow, TP: Green, Regular: Subject Color
                                  const slotColor = isRemedial
                                    ? '#ef4444'
                                    : isTd
                                    ? '#eab308'
                                    : isTp
                                    ? '#10b981'
                                    : meta?.defaultColor || '#d4af37';

                                  const bgTint = isRemedial
                                    ? 'bg-red-950/30 border-red-500/50'
                                    : isTd
                                    ? 'bg-amber-950/25 border-amber-400/50'
                                    : isTp
                                    ? 'bg-emerald-950/25 border-emerald-500/50'
                                    : 'bg-[#121212] border-[#222]';

                                  return (
                                    <div
                                      key={slot.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSlotClick(slot);
                                      }}
                                      className={`p-2 rounded-xl text-right transition-all cursor-pointer shadow-md relative border ${bgTint} ${
                                        isSelected
                                          ? 'ring-2 ring-[#d4af37] scale-102 z-10 bg-[#1a120a]'
                                          : 'hover:border-[#555]'
                                      }`}
                                      style={{
                                        borderRight: `4px solid ${slotColor}`,
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div
                                          className="font-bold text-xs flex items-center gap-1"
                                          style={{ color: slotColor }}
                                        >
                                          {meta?.name || slot.subjectId}
                                          {isAnnex && (
                                            <span className="text-[8px] bg-purple-900/60 text-purple-200 border border-purple-400/40 font-bold px-1 rounded">
                                              ملحقة
                                            </span>
                                          )}
                                        </div>
                                        {isRemedial ? (
                                          <span className="text-[9px] bg-red-600/25 text-red-300 border border-red-500/50 font-bold px-1 rounded flex items-center gap-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                            استدراك
                                          </span>
                                        ) : isTp ? (
                                          <span className="text-[9px] bg-emerald-600/25 text-emerald-300 border border-emerald-500/50 font-bold px-1 rounded flex items-center gap-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                            TP مخبر
                                          </span>
                                        ) : isTd ? (
                                          <span className="text-[9px] bg-amber-500/25 text-amber-300 border border-amber-400/50 font-bold px-1 rounded flex items-center gap-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                            TD تفويج
                                          </span>
                                        ) : slot.type === 'sport' ? (
                                          <span className="text-[9px] bg-[#1a2e1a] text-[#4ade80] border border-[#4ade80]/30 font-bold px-1 rounded">
                                            رياضة
                                          </span>
                                        ) : null}
                                      </div>

                                      <div className="text-[10px] text-[#ccc] font-medium mt-1">
                                        {viewMode === 'class'
                                          ? teacher?.name || 'أستاذ غير محدد'
                                          : viewMode === 'teacher'
                                          ? `الفوج: ${cls?.name || slot.classId}`
                                          : `${cls?.name} • ${teacher?.name}`}
                                      </div>

                                      <div className="text-[9px] text-[#666] flex items-center justify-between mt-0.5">
                                        <span>{room?.name || 'قاعة غير محددة'}</span>
                                        {onDeleteSlot && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onDeleteSlot(slot.id);
                                            }}
                                            className="p-0.5 text-[#666] hover:text-[#f87171] rounded transition-colors cursor-pointer"
                                            title="حذف هذه الحصة"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : isTeacherPedSlot ? (
                              <div
                                onClick={() => handleCellTargetClick(day, p.id)}
                                className={`h-full flex flex-col items-center justify-center p-1 rounded-xl text-center cursor-pointer transition-all ${
                                  teacherPedRange === 'all_day'
                                    ? 'bg-purple-950/40 border border-purple-500/60 hover:bg-purple-900/50'
                                    : 'bg-purple-950/25 border border-purple-500/40 hover:bg-purple-900/30'
                                }`}
                                title="فترة ندوة التنسيق البيداغوجي للمادة المعتمدة بالذكاء الاصطناعي (اضغط للإسناد الاستثنائي)"
                              >
                                <span className="text-[10px] text-purple-300 font-bold flex items-center gap-1">
                                  <span>🎓</span>
                                  <span>{teacherPedRange === 'all_day' ? 'تفريغ كامل' : 'يوم بيداغوجي'}</span>
                                </span>
                                <span className="text-[9px] text-purple-400/90 font-medium">
                                  {teacherPedRange === 'all_day' ? 'يوم كامل مفرغ 🌟' : 'ندوة المادة (AI)'}
                                </span>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleCellTargetClick(day, p.id)}
                                className={`h-full flex flex-col items-center justify-center text-[10px] transition-all cursor-pointer group ${
                                  p.id === 7 ? 'text-red-400/60 hover:text-red-300' : 'text-[#444] hover:text-[#d4af37]'
                                }`}
                                title={p.id === 7 ? 'الحصة 7 مخصصة للاستدراك والدعم (اضغط للإسناد اليدوي)' : 'اضغط لملء هذه الخانة يدوياً'}
                              >
                                {p.id === 7 ? (
                                  <>
                                    <span className="text-[11px] opacity-70 group-hover:opacity-100 transition-opacity">🎯</span>
                                    <span className="text-[8px] text-red-300/80 font-bold mt-0.5">
                                      مخصصة للاستدراك
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 opacity-30 group-hover:opacity-100 group-hover:scale-125 transition-all text-[#d4af37]" />
                                    <span className="text-[8px] opacity-0 group-hover:opacity-100 text-[#d4af37] font-bold mt-0.5">
                                      + ملء يدوي
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Master Institutional Matrix: All Classes */
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-center border-collapse border border-[#222] text-xs">
              <thead className="bg-[#111] text-[#e0e0e0] sticky top-0 z-20">
                <tr>
                  <th className="p-2 border border-[#222] w-24 bg-[#0a0a0a] text-[#d4af37]">القسم</th>
                  {days.map((day) => (
                    <th
                      key={day}
                      colSpan={day === 'الثلاثاء' && config.tuesdayAfternoonOff ? 4 : 8}
                      className="p-2 border border-[#222] text-[#aaa]"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
                <tr className="bg-[#0f0f0f] text-[10px] text-[#666]">
                  <th className="p-1 border border-[#222]">الفوج</th>
                  {days.map((day) => {
                    const count = day === 'الثلاثاء' && config.tuesdayAfternoonOff ? 4 : 8;
                    return Array.from({ length: count }, (_, i) => (
                      <th key={`${day}-${i}`} className="p-1 border border-[#222] min-w-[50px]">
                        ح{i + 1}
                      </th>
                    ));
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {classes.map((cls) => (
                  <tr key={cls.id} className="hover:bg-[#141414]">
                    <td className="p-2 font-bold text-white bg-[#0d0d0d] border border-[#222]">
                      {cls.name}
                    </td>

                    {days.map((day) => {
                      const count = day === 'الثلاثاء' && config.tuesdayAfternoonOff ? 4 : 8;
                      return Array.from({ length: count }, (_, i) => {
                        const period = i + 1;
                        const slot = slots.find(
                          (s) => s.classId === cls.id && s.day === day && s.period === period
                        );
                        const meta = slot ? SUBJECT_METADATA[slot.subjectId] : null;

                        return (
                          <td
                            key={`${day}-${period}`}
                            className="p-1 border border-[#222] text-[10px] h-10 bg-[#050505]"
                          >
                            {slot ? (
                              <div
                                className="font-bold truncate px-1 py-0.5 rounded bg-[#141414] border border-[#222]"
                                style={{ color: meta?.defaultColor || '#e0e0e0' }}
                                title={`${meta?.name} - ${teacherMap.get(slot.teacherId)?.name}`}
                              >
                                {meta?.name?.slice(0, 7)}..
                              </div>
                            ) : (
                              <span className="text-[#333]">—</span>
                            )}
                          </td>
                        );
                      });
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state notice if slots are 0 */}
        {slots.length === 0 && (
          <div className="p-8 bg-gradient-to-b from-[#141208] to-[#0a0a0a] border-2 border-dashed border-[#d4af37]/40 rounded-2xl text-center space-y-4 shadow-2xl animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-[#1c1808] border border-[#d4af37]/50 flex items-center justify-center mx-auto text-[#d4af37]">
              <Scale className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base md:text-lg font-bold text-[#d4af37]">
                وضع الملء اليدوي المباشر للسيد مدير المؤسسة (الجداول مفرغة وجاهزة)
              </h3>
              <p className="text-xs text-[#aaa] max-w-2xl mx-auto leading-relaxed">
                تم تفريغ جداول التوقيت بناءً على طلبك لتتمكن من إسناد وتعيين الحصص يدوياً خانة بخانة وفق النصاب القانوني
                (28.5 ساعة لكل قسم و 18 ساعة لكل أستاذ). اضغط على أي خانة فارغة في الجدول أعلاه لإسناد الأستاذ والمادة والقاعة.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setNewSlotDay('الأحد');
                  setNewSlotPeriod(1);
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black font-bold text-xs rounded-xl shadow-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة أول حصة يدوياً الآن</span>
              </button>
              <button
                onClick={() => setShowLegalTableModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#161616] hover:bg-[#222] text-[#4ade80] border border-[#4ade80]/40 font-bold text-xs rounded-xl cursor-pointer"
              >
                <Scale className="w-4 h-4" />
                <span>عرض جدول الحصص والأنصبة القانونية</span>
              </button>
              <button
                onClick={() => setShowPedagogicalModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1c142b] hover:bg-[#281c3d] text-[#c084fc] border border-[#c084fc]/40 font-bold text-xs rounded-xl cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>تحديد الأيام البيداغوجية بالـ AI</span>
              </button>
              {onGenerateFreshTimetable && (
                <button
                  onClick={() => {
                    if (window.confirm('هل تود استرجاع التوليد الآلي الذكي لجميع الأقسام وفق المنظومة الرسمية؟')) {
                      onGenerateFreshTimetable();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#121d2a] hover:bg-[#1a2b3d] text-[#38bdf8] border border-[#38bdf8]/40 font-bold text-xs rounded-xl cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>استرجاع التوليد الآلي (CSP)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Timetable Signatures Footer */}
        <div className="pt-6 border-t border-[#222] grid grid-cols-3 text-center text-xs text-[#888] font-bold">
          <div>مستشار التربية</div>
          <div>الناظر (مدير الدراسات)</div>
          <div>مدير المؤسسة والتأشيرة</div>
        </div>
      </div>

      {/* Manual Add Slot Modal (Rich options for Principal) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#101010] border border-[#d4af37]/40 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1c1808] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm md:text-base flex items-center gap-2">
                    <span>إسناد وتثبيت حصة يدوياً لمدير المؤسسة</span>
                    <span className="text-[11px] bg-[#1a120a] text-[#d4af37] px-2 py-0.5 rounded-full border border-[#d4af37]/40 font-bold">
                      {newSlotDay} - الحصة {newSlotPeriod}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#888] mt-0.5">
                    اختر القسم، المادة، وتعرّف على الأقسام المسندة والنصاب القانوني لكل أستاذ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-[#222] text-[#888] rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Grid: Class and Subject */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaa] font-bold mb-1">القسم / الفوج التربوي:</label>
                  <select
                    value={newSlotClassId}
                    onChange={(e) => {
                      setNewSlotClassId(e.target.value);
                    }}
                    className="w-full p-2.5 bg-[#181818] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37] font-bold"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.level}) - {c.studentCount} تلميذ
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#aaa] font-bold mb-1">المادة التعليمية (وفق المنشور الوزاري):</label>
                  <select
                    value={newSlotSubjectId}
                    onChange={(e) => handleSelectSubjectForNewSlot(e.target.value as SubjectId)}
                    className="w-full p-2.5 bg-[#181818] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37] font-bold"
                  >
                    {Object.entries(SUBJECT_METADATA).map(([key, meta]) => {
                      const activeClass = classMap.get(newSlotClassId);
                      const rule = rules.find((r) => r.subject_id === key && r.level === activeClass?.level);
                      const legalHours = rule ? `${rule.weekly_hours} سا` : '';
                      return (
                        <option key={key} value={key}>
                          {meta.name} {legalHours ? `(${legalHours} أسبوعياً)` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Teacher Selection with Assigned Classes, Total Hours, and Pedagogical Day */}
              <div>
                <label className="block text-[#aaa] font-bold mb-1.5 flex items-center justify-between">
                  <span>خيارات الأساتذة (الأقسام المسندة، النصاب القانوني الكلي، واليوم البيداغوجي):</span>
                  <span className="text-[11px] text-[#d4af37] font-normal">
                    انقر على بطاقة الأستاذ لتحديده مباشرة
                  </span>
                </label>

                {(() => {
                  const subjectTeachers = teachers.filter((t) => t.subjectId === newSlotSubjectId);
                  const candidateList = subjectTeachers.length > 0 ? subjectTeachers : teachers;

                  return (
                    <div className="space-y-2 max-h-56 overflow-y-auto p-2 bg-[#141414] rounded-xl border border-[#222]">
                      {candidateList.map((t) => {
                        const isSelected = newSlotTeacherId === t.id;
                        const isAssignedToThisClass = t.assignedClassIds.includes(newSlotClassId);
                        const scheduledSlots = slots.filter((s) => s.teacherId === t.id).length;
                        const maxQuota = t.maxWeeklyHours || 18;
                        const remainingQuota = maxQuota - scheduledSlots;
                        const tPedDay = t.pedagogicalDay || config.subjectPedagogicalDays?.[t.subjectId]?.day;
                        const tPedRange = t.pedagogicalPeriodRange || config.subjectPedagogicalDays?.[t.subjectId]?.periodRange || 'morning';
                        const isPedDayConflict =
                          tPedDay === newSlotDay &&
                          ((tPedRange === 'morning' && newSlotPeriod <= 4) ||
                            (tPedRange === 'afternoon' && newSlotPeriod >= 5));

                        return (
                          <div
                            key={t.id}
                            onClick={() => setNewSlotTeacherId(t.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#1e1708] border-[#d4af37] shadow-md ring-1 ring-[#d4af37]'
                                : 'bg-[#181818] border-[#292929] hover:bg-[#202020] hover:border-[#444]'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  checked={isSelected}
                                  onChange={() => setNewSlotTeacherId(t.id)}
                                  className="accent-[#d4af37] w-4 h-4 cursor-pointer"
                                />
                                <div className="font-bold text-white text-xs">
                                  {t.name}
                                </div>
                                <span className="text-[10px] text-[#888]">
                                  ({SUBJECT_METADATA[t.subjectId]?.name || t.subjectId})
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {isAssignedToThisClass ? (
                                  <span className="px-2 py-0.5 bg-emerald-950/50 text-emerald-300 border border-emerald-500/40 rounded-md font-bold text-[10px]">
                                    ✓ مسند لهذا القسم
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-amber-950/40 text-amber-300 border border-amber-500/40 rounded-md text-[10px]">
                                    ⚠️ غير مسند لهذا القسم
                                  </span>
                                )}

                                <span className="px-2 py-0.5 bg-[#121212] text-white border border-[#333] rounded-md text-[10px] font-mono">
                                  النصاب: {scheduledSlots} / {maxQuota} سا (متبقي {remainingQuota} سا)
                                </span>

                                <span className="px-2 py-0.5 bg-[#1c142b] text-[#c084fc] border border-[#c084fc]/30 rounded-md text-[10px]">
                                  اليوم البيداغوجي: {tPedDay || 'الثلاثاء'}
                                </span>
                              </div>
                            </div>

                            {/* Assigned classes tags list */}
                            <div className="mt-2 pt-2 border-t border-[#252525] flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="text-[#888] font-bold">الأقسام المسندة للأستاذ:</span>
                              {t.assignedClassIds.length > 0 ? (
                                t.assignedClassIds.map((cId) => {
                                  const cls = classMap.get(cId);
                                  const isCurrent = cId === newSlotClassId;
                                  return (
                                    <span
                                      key={cId}
                                      className={`px-1.5 py-0.5 rounded font-bold ${
                                        isCurrent
                                          ? 'bg-[#d4af37] text-black shadow-xs'
                                          : 'bg-[#222] text-[#ccc] border border-[#333]'
                                      }`}
                                    >
                                      {cls?.name || cId}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-[#555] italic">لم تسند له أقسام بعد</span>
                              )}
                            </div>

                            {/* Pedagogical Day Warning */}
                            {isPedDayConflict && (
                              <div className="mt-2 p-1.5 bg-red-950/40 border border-red-500/40 rounded-lg text-red-300 text-[10px] font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                                <span>
                                  تنبيه: هذا التوقيت يوافق فترة اليوم البيداغوجي للأستاذ ({tPedDay} - {tPedRange === 'morning' ? 'صباحاً' : 'مساءً'}) المعتمدة بالذكاء الاصطناعي.
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Grid: Room and Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaa] font-bold mb-1">القاعة / المخبر:</label>
                  <select
                    value={newSlotRoomId}
                    onChange={(e) => setNewSlotRoomId(e.target.value)}
                    className="w-full p-2.5 bg-[#181818] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.type === 'regular' ? 'قاعة عادية' : 'مخبر/ورشة'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#aaa] font-bold mb-1">نوع الحصة ونظام التفويج:</label>
                  <select
                    value={newSlotType}
                    onChange={(e) => setNewSlotType(e.target.value as any)}
                    className="w-full p-2.5 bg-[#181818] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                  >
                    <option value="course">حصة نظرية عادية كاملة (Course)</option>
                    <option value="td">أعمال موجهة فوج مصغر (TD - أصفر)</option>
                    <option value="tp">أعمال تطبيقية مخابر علوم/تكنولوجيا (TP - أخضر)</option>
                    <option value="remedial">استدراك ودعم تربوي (Remedial - أحمر)</option>
                    <option value="sport">تربية بدنية ورياضية (Sport)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#222]">
              <span className="text-[11px] text-[#888]">
                سيتم تثبيت الحصة في جدول الفوج وجدول الأستاذ مع تحديث النصاب فوراً.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-[#222] hover:bg-[#2c2c2c] text-[#ccc] rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmAddSlot}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black font-bold text-xs rounded-xl shadow-lg cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تثبيت الحصة في استعمال الزمن</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Pedagogical Days Modal */}
      <PedagogicalDaysModal
        isOpen={showPedagogicalModal}
        onClose={() => setShowPedagogicalModal(false)}
        teachers={teachers}
        config={config}
        classes={classes}
        onApplyAssignments={(newTeachers, newConfig) => {
          if (onUpdateTeachersAndConfig) {
            onUpdateTeachersAndConfig(newTeachers, newConfig);
          }
        }}
      />

      {/* Official Legal Subjects and Quotas Table Modal */}
      <OfficialLegalSubjectsTableModal
        isOpen={showLegalTableModal}
        onClose={() => setShowLegalTableModal(false)}
      />
    </div>
  );
};
