import React, { useState } from 'react';
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
  Filter,
  RefreshCw,
  Clock,
  Plus,
  Trash2,
  Save,
  X,
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
  onSaveVersion?: (name?: string, notes?: string) => void;
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
  onSaveVersion,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '1am1');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || 't-ar-1');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || 'room-01');

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
      if (viewMode === 'class') setNewSlotClassId(selectedClassId);
      if (viewMode === 'teacher') setNewSlotTeacherId(selectedTeacherId);
      if (viewMode === 'room') setNewSlotRoomId(selectedRoomId);
      setShowAddModal(true);
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
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          {viewMode === 'class' && (
            <button
              onClick={() => onAutoRebalance(selectedClassId, undefined)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1a120a] hover:bg-[#261b0f] text-[#d4af37] border border-[#d4af37]/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="إعادة توزيع وحل حصص هذا القسم تلقائياً"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>إعادة موازنة الفوج</span>
            </button>
          )}

          {viewMode === 'teacher' && (
            <button
              onClick={() => onAutoRebalance(undefined, selectedTeacherId)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1a120a] hover:bg-[#261b0f] text-[#d4af37] border border-[#d4af37]/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="إعادة توزيع حصص هذا الأستاذ تلقائياً"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>إعادة موازنة الأستاذ</span>
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
      <div className="bg-[#0a0a0a] p-3.5 rounded-2xl border border-[#222] flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {viewMode === 'class' && (
          <div className="flex items-center gap-2 overflow-x-auto w-full">
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
        )}

        {viewMode === 'teacher' && (
          <div className="flex items-center gap-2 overflow-x-auto w-full">
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

            {currentTeacher && (
              <div className="text-xs text-[#888] mr-4 font-medium flex items-center gap-2">
                <span>المادة: <strong className="text-[#d4af37]">{SUBJECT_METADATA[currentTeacher.subjectId]?.name}</strong></span>
                <span>•</span>
                <span>النصاب: <strong className="text-white">{slots.filter((s) => s.teacherId === currentTeacher.id).length} / {currentTeacher.maxWeeklyHours} سا</strong></span>
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
                      <div className="font-bold text-[#e0e0e0]">{p.name}</div>
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

                        return (
                          <td
                            key={p.id}
                            onClick={() => {
                              if (cellSlots.length === 0 && selectedMovingSlot) {
                                handleCellTargetClick(day, p.id);
                              }
                            }}
                            className={`border border-[#222] p-1.5 min-w-[105px] h-20 align-top transition-all bg-[#050505] ${
                              p.id === 4 ? 'border-l-4 border-l-[#333]' : ''
                            } ${
                              selectedMovingSlot && cellSlots.length === 0
                                ? 'bg-[#1a120a]/80 hover:bg-[#261a0e] cursor-pointer border-dashed border-2 border-[#d4af37]'
                                : 'hover:bg-[#121212]'
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

                                  return (
                                    <div
                                      key={slot.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSlotClick(slot);
                                      }}
                                      className={`p-2 rounded-xl text-right transition-all cursor-pointer shadow-md relative bg-[#121212] border border-[#222] ${
                                        isSelected
                                          ? 'ring-2 ring-[#d4af37] scale-102 z-10 bg-[#1a120a]'
                                          : 'hover:border-[#444]'
                                      }`}
                                      style={{
                                        borderRight: `4px solid ${meta?.defaultColor || '#d4af37'}`,
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div
                                          className="font-bold text-xs"
                                          style={{ color: meta?.defaultColor || '#e0e0e0' }}
                                        >
                                          {meta?.name || slot.subjectId}
                                        </div>
                                        {slot.type === 'tp' ? (
                                          <span className="text-[9px] bg-[#0c192c] text-[#60a5fa] border border-[#60a5fa]/30 font-bold px-1 rounded">
                                            TP مخبر
                                          </span>
                                        ) : slot.type === 'td' ? (
                                          <span className="text-[9px] bg-[#1a120a] text-[#d4af37] border border-[#d4af37]/30 font-bold px-1 rounded">
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
                            ) : (
                              <div className="h-full flex items-center justify-center text-[10px] text-[#444] hover:text-[#d4af37] transition-colors">
                                <Plus className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
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
          <div className="p-6 bg-[#121212] border border-[#333] rounded-2xl text-center space-y-2 text-xs">
            <div className="text-[#d4af37] font-bold text-sm">الجداول مفرغة حالياً وجاهزة للملء اليدوي الكامل</div>
            <p className="text-[#888]">
              اضغط على أي خانة فارغة في الجدول أعلاه لتعيين المادة، الأستاذ، والقاعة يدوياً بكل سهولة، أو توجه لتبويب المساعد الذكي لتوليد خيار آلي جديد.
            </p>
          </div>
        )}

        {/* Timetable Signatures Footer */}
        <div className="pt-6 border-t border-[#222] grid grid-cols-3 text-center text-xs text-[#888] font-bold">
          <div>مستشار التربية</div>
          <div>الناظر (مدير الدراسات)</div>
          <div>مدير المؤسسة والتأشيرة</div>
        </div>
      </div>

      {/* Manual Add Slot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#d4af37]/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#d4af37]" />
                <h3 className="font-bold text-white text-sm">
                  إضافة حصة يدوياً ({newSlotDay} - الحصة {newSlotPeriod})
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-[#222] text-[#888] rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#aaa] font-bold mb-1">القسم / الفوج:</label>
                <select
                  value={newSlotClassId}
                  onChange={(e) => setNewSlotClassId(e.target.value)}
                  className="w-full p-2 bg-[#181818] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.level})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#aaa] font-bold mb-1">المادة التعليمية:</label>
                <select
                  value={newSlotSubjectId}
                  onChange={(e) => setNewSlotSubjectId(e.target.value as SubjectId)}
                  className="w-full p-2 bg-[#181818] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                >
                  {Object.entries(SUBJECT_METADATA).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#aaa] font-bold mb-1">الأستاذ:</label>
                <select
                  value={newSlotTeacherId}
                  onChange={(e) => setNewSlotTeacherId(e.target.value)}
                  className="w-full p-2 bg-[#181818] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                >
                  {teachers
                    .filter((t) => t.subjectId === newSlotSubjectId || !newSlotSubjectId)
                    .concat(teachers.filter((t) => t.subjectId !== newSlotSubjectId))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({SUBJECT_METADATA[t.subjectId]?.name || t.subjectId})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[#aaa] font-bold mb-1">القاعة / المخبر:</label>
                <select
                  value={newSlotRoomId}
                  onChange={(e) => setNewSlotRoomId(e.target.value)}
                  className="w-full p-2 bg-[#181818] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.type === 'regular' ? 'قاعة عادية' : 'مخبر/ورشة'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#aaa] font-bold mb-1">نوع الحصة:</label>
                <select
                  value={newSlotType}
                  onChange={(e) => setNewSlotType(e.target.value as any)}
                  className="w-full p-2 bg-[#181818] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                >
                  <option value="course">حصة عادية كاملة (Course)</option>
                  <option value="td">أعمال موجهة فوج مصغر (TD)</option>
                  <option value="tp">أعمال تطبيقية مخبرية (TP)</option>
                  <option value="sport">تربية بدنية ورياضية (Sport)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-[#222] hover:bg-[#2c2c2c] text-[#ccc] rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmAddSlot}
                className="px-5 py-2 bg-[#d4af37] hover:bg-[#c59e2e] text-black font-bold text-xs rounded-xl shadow-lg cursor-pointer"
              >
                إضافة وتثبيت الحصة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
