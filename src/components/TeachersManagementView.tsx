import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BookOpen,
  Calendar,
  Trash2,
  Edit2,
  CalendarX,
  Layers,
  Save,
  FileSpreadsheet,
} from 'lucide-react';
import { Teacher, SchoolClass, SubjectRule, SubjectId } from '../types';
import { SUBJECT_METADATA } from '../data/officialData';
import { calculateAllTeachersWorkloads } from '../services/workloadCalculator';
import { SubjectIcon } from './SubjectIcon';

interface Props {
  teachers: Teacher[];
  classes: SchoolClass[];
  rules: SubjectRule[];
  onUpdateTeacher: (teacher: Teacher) => void;
  onAddTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onBulkImportTeachers: (newTeachers: Teacher[]) => void;
}

export const TeachersManagementView: React.FC<Props> = ({
  teachers,
  classes,
  rules,
  onUpdateTeacher,
  onAddTeacher,
  onDeleteTeacher,
  onBulkImportTeachers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedTeacherForUnavail, setSelectedTeacherForUnavail] = useState<Teacher | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAiImportModal, setShowAiImportModal] = useState(false);

  // AI Import State
  const [rawRosterText, setRawRosterText] = useState('');
  const [isAiImporting, setIsAiImporting] = useState(false);
  const [aiImportError, setAiImportError] = useState('');

  // Form State for Add / Edit
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState<SubjectId>('arabic');
  const [formMaxHours, setFormMaxHours] = useState(18);
  const [formMinHours, setFormMinHours] = useState(18);
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formAssignedClasses, setFormAssignedClasses] = useState<string[]>([]);

  // Calculate workloads
  const workloadReports = calculateAllTeachersWorkloads(teachers, classes, rules);
  const workloadMap = new Map(workloadReports.map((w) => [w.teacherId, w]));

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      SUBJECT_METADATA[t.subjectId]?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject =
      selectedSubjectFilter === 'all' || t.subjectId === selectedSubjectFilter;
    return matchesSearch && matchesSubject;
  });

  const handleOpenAdd = () => {
    setFormName('');
    setFormSubject('arabic');
    setFormMaxHours(18);
    setFormMinHours(18);
    setFormPhone('');
    setFormNotes('');
    setFormAssignedClasses([]);
    setEditingTeacher(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setFormName(t.name);
    setFormSubject(t.subjectId);
    setFormMaxHours(t.maxWeeklyHours);
    setFormMinHours(t.minWeeklyHours);
    setFormPhone(t.phone || '');
    setFormNotes(t.notes || '');
    setFormAssignedClasses([...t.assignedClassIds]);
    setShowAddModal(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingTeacher) {
      const updated: Teacher = {
        ...editingTeacher,
        name: formName,
        subjectId: formSubject,
        maxWeeklyHours: Number(formMaxHours),
        minWeeklyHours: Number(formMinHours),
        phone: formPhone,
        notes: formNotes,
        assignedClassIds: formAssignedClasses,
      };
      onUpdateTeacher(updated);
    } else {
      const created: Teacher = {
        id: `t-${formSubject}-${Date.now()}`,
        name: formName,
        subjectId: formSubject,
        maxWeeklyHours: Number(formMaxHours),
        minWeeklyHours: Number(formMinHours),
        phone: formPhone,
        notes: formNotes,
        assignedClassIds: formAssignedClasses,
        unavailableSlots: [],
      };
      onAddTeacher(created);
    }
    setShowAddModal(false);
  };

  const toggleClassAssignment = (cId: string) => {
    if (formAssignedClasses.includes(cId)) {
      setFormAssignedClasses(formAssignedClasses.filter((id) => id !== cId));
    } else {
      setFormAssignedClasses([...formAssignedClasses, cId]);
    }
  };

  // Toggle unavailability slot
  const toggleTeacherUnavailabilitySlot = (teacher: Teacher, day: string, period: number) => {
    const exists = teacher.unavailableSlots.some((u) => u.day === day && u.period === period);
    let updatedSlots = [];
    if (exists) {
      updatedSlots = teacher.unavailableSlots.filter(
        (u) => !(u.day === day && u.period === period)
      );
    } else {
      updatedSlots = [...teacher.unavailableSlots, { day, period }];
    }
    const updatedTeacher = { ...teacher, unavailableSlots: updatedSlots };
    onUpdateTeacher(updatedTeacher);
    setSelectedTeacherForUnavail(updatedTeacher);
  };

  // Handle AI Import
  const handleRunAiImport = async () => {
    if (!rawRosterText.trim()) return;
    setIsAiImporting(true);
    setAiImportError('');

    try {
      const response = await fetch('/api/gemini/import-teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawRosterText }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر معالجة النص بواسطة الذكاء الاصطناعي');
      }

      if (data.teachers && data.teachers.length > 0) {
        onBulkImportTeachers(data.teachers);
        setShowAiImportModal(false);
        setRawRosterText('');
      } else {
        setAiImportError('لم يتم العثور على بيانات أساتذة واضحة في النص المدخل.');
      }
    } catch (err: any) {
      setAiImportError(err.message || 'حدث خطأ أثناء استيراد الأساتذة');
    } finally {
      setIsAiImporting(false);
    }
  };

  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div id="teachers-management-view" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0a0a0a] text-white rounded-2xl p-6 shadow-xl border border-[#222] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#141414] border border-[#d4af37]/40 rounded-full text-[#d4af37] text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>هيئة التدريس والنصاب الساعي الآلي</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#d4af37]">
            إدارة الأساتذة وحساب النصاب القانوني
          </h2>
          <p className="text-[#888] text-xs md:text-sm mt-1 max-w-2xl">
            يقوم النظام بحساب مجموع ساعات كل أستاذ تلقائياً من خلال ضرب الأقسام المسندة في الحجم
            الساعي الوزاري لكل مستوى وإظهار مؤشرات التطابق فوراً.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="ai-import-teachers-btn"
            onClick={() => setShowAiImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#141414] hover:bg-[#222] text-[#d4af37] border border-[#d4af37]/40 text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#d4af37]" />
            <span>استيراد ذكي بالـ AI</span>
          </button>
          <button
            id="add-new-teacher-btn"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة أستاذ</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-[#222] shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#666] absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث بالاسم أو المادة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-10 py-2 bg-[#121212] border border-[#222] text-white rounded-xl text-xs focus:border-[#d4af37] outline-hidden placeholder-[#555]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1">
          <button
            onClick={() => setSelectedSubjectFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              selectedSubjectFilter === 'all'
                ? 'bg-[#d4af37] text-black font-bold'
                : 'bg-[#141414] text-[#888] hover:bg-[#222] border border-[#222]'
            }`}
          >
            الكل ({teachers.length})
          </button>
          {Object.entries(SUBJECT_METADATA).map(([key, meta]) => {
            const count = teachers.filter((t) => t.subjectId === key).length;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setSelectedSubjectFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedSubjectFilter === key
                    ? 'bg-[#d4af37] text-black font-bold'
                    : 'bg-[#141414] text-[#888] hover:bg-[#222] border border-[#222]'
                }`}
              >
                <span>{meta.name}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Teachers Roster Table */}
      <div className="bg-[#0a0a0a] rounded-2xl shadow-xl border border-[#222] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#121212] text-[#d4af37] font-bold border-b border-[#222]">
              <tr>
                <th className="p-3.5">الأستاذ(ة)</th>
                <th className="p-3.5">المادة التعليمية</th>
                <th className="p-3.5">الأفواج والأقسام المسندة</th>
                <th className="p-3.5 text-center">النصاب المحسوب</th>
                <th className="p-3.5 text-center">حالة النصاب</th>
                <th className="p-3.5 text-center">قيود عدم التوفر</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {filteredTeachers.map((teacher) => {
                const workload = workloadMap.get(teacher.id);
                const meta = SUBJECT_METADATA[teacher.subjectId];
                const unavailCount = teacher.unavailableSlots.length;

                return (
                  <tr key={teacher.id} className="hover:bg-[#121212] transition-colors">
                    <td className="p-3.5 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs border border-[#333]"
                          style={{ backgroundColor: meta?.defaultColor || '#059669' }}
                        >
                          {teacher.name.replace('أ. ', '').slice(0, 1)}
                        </div>
                        <div>
                          <div className="text-white">{teacher.name}</div>
                          {teacher.phone && (
                            <div className="text-[10px] text-[#666] font-normal">
                              {teacher.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-medium text-[#ccc]">
                      <div className="flex items-center gap-1.5">
                        <SubjectIcon subjectId={teacher.subjectId} className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>{meta?.name || teacher.subjectId}</span>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {teacher.assignedClassIds.length > 0 ? (
                          teacher.assignedClassIds.map((cId) => {
                            const cls = classes.find((c) => c.id === cId);
                            return (
                              <span
                                key={cId}
                                className="px-2 py-0.5 bg-[#141414] border border-[#222] text-[#d4af37] rounded-md text-[11px] font-semibold"
                              >
                                {cls?.name || cId}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[#555] italic text-[11px]">
                            لم يتم إسناد أقسام بعد
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-center font-bold">
                      <div className="text-white text-sm">
                        {workload?.calculatedRequiredHours || 0} سا
                      </div>
                      <div className="text-[10px] text-[#666] font-normal">
                        من أصل {teacher.maxWeeklyHours} سا
                      </div>
                    </td>

                    <td className="p-3.5 text-center">
                      {workload?.status === 'matched' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1a2e1a] text-[#4ade80] border border-[#4ade80]/30 rounded-full font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>متطابقة (نصاب مكتمل)</span>
                        </span>
                      ) : workload?.status === 'overloaded' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#2a0e0e] text-[#f87171] border border-[#f87171]/30 rounded-full font-bold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>عبء زائد (+{workload.difference} سا)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1a120a] text-[#d4af37] border border-[#d4af37]/30 rounded-full font-bold text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>ساعات شاغرة ({workload?.difference} سا)</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setSelectedTeacherForUnavail(teacher)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors cursor-pointer ${
                          unavailCount > 0
                            ? 'bg-[#1c142b] text-[#c084fc] border border-[#c084fc]/30 hover:bg-[#271c3d]'
                            : 'bg-[#141414] text-[#888] hover:bg-[#222] border border-[#222]'
                        }`}
                      >
                        <CalendarX className="w-3.5 h-3.5" />
                        <span>{unavailCount > 0 ? `${unavailCount} فترات مقفلة` : 'تحديد الفراغ'}</span>
                      </button>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(teacher)}
                          className="p-1.5 text-[#888] hover:text-[#d4af37] hover:bg-[#141414] rounded-lg transition-colors cursor-pointer"
                          title="تعديل الأستاذ والأقسام"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من حذف ${teacher.name}؟`)) {
                              onDeleteTeacher(teacher.id);
                            }
                          }}
                          className="p-1.5 text-[#888] hover:text-[#f87171] hover:bg-[#2a0e0e] rounded-lg transition-colors cursor-pointer"
                          title="حذف الأستاذ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teacher Availability Matrix Modal */}
      {selectedTeacherForUnavail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0a0a0a] rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#222] space-y-4">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <div>
                <h3 className="font-bold text-[#d4af37] text-base flex items-center gap-2">
                  <CalendarX className="w-5 h-5 text-[#d4af37]" />
                  <span>قيود وتفريغ أوقات الأستاذ: {selectedTeacherForUnavail.name}</span>
                </h3>
                <p className="text-xs text-[#888] mt-0.5">
                  انقر على أي خلية لجعلها (غير متاحة ⛔) أو (متاحة للجدولة ✓)
                </p>
              </div>
              <button
                onClick={() => setSelectedTeacherForUnavail(null)}
                className="w-7 h-7 rounded-full bg-[#141414] hover:bg-[#222] border border-[#333] flex items-center justify-center text-[#aaa] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="bg-[#121212] text-[#d4af37]">
                    <th className="p-2 border border-[#222] font-bold">اليوم</th>
                    {periods.map((p) => (
                      <th key={p} className="p-2 border border-[#222] font-bold">
                        {p <= 4 ? `ص ${p}` : `م ${p}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map((day) => (
                    <tr key={day}>
                      <td className="p-2 font-bold bg-[#141414] text-[#ccc] border border-[#222]">{day}</td>
                      {periods.map((period) => {
                        const isBlocked = selectedTeacherForUnavail.unavailableSlots.some(
                          (u) => u.day === day && u.period === period
                        );
                        return (
                          <td
                            key={period}
                            onClick={() =>
                              toggleTeacherUnavailabilitySlot(
                                selectedTeacherForUnavail,
                                day,
                                period
                              )
                            }
                            className={`p-2 border border-[#222] cursor-pointer transition-all ${
                              isBlocked
                                ? 'bg-[#991b1b] text-white font-bold shadow-inner'
                                : 'bg-[#0f1f14] hover:bg-[#142e1d] text-[#4ade80]'
                            }`}
                          >
                            {isBlocked ? '⛔ مقفلة' : '✓ متاح'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-[#888]">
                مجموع الفترات المقفلة:{' '}
                <strong className="text-[#f87171]">
                  {selectedTeacherForUnavail.unavailableSlots.length} حصص
                </strong>
              </span>
              <button
                onClick={() => setSelectedTeacherForUnavail(null)}
                className="px-5 py-2 bg-[#d4af37] hover:bg-[#c59e2e] text-black text-xs font-bold rounded-xl cursor-pointer"
              >
                إغلاق واعتماد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0a0a0a] rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#222] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <h3 className="font-bold text-[#d4af37] text-base">
                {editingTeacher ? 'تعديل بيانات الأستاذ' : 'إضافة أستاذ جديد'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-[#141414] hover:bg-[#222] border border-[#333] flex items-center justify-center text-[#aaa] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1">
                    اسم الأستاذ الكامل
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: أ. عبد القادر بوجمعة"
                    className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs focus:border-[#d4af37] outline-hidden placeholder-[#555]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1">
                    المادة التعليمية
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value as SubjectId)}
                    className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs focus:border-[#d4af37] outline-hidden"
                  >
                    {Object.entries(SUBJECT_METADATA).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1">
                    النصاب الأسبوعي الأقصى (سا)
                  </label>
                  <input
                    type="number"
                    value={formMaxHours}
                    onChange={(e) => setFormMaxHours(Number(e.target.value))}
                    min={1}
                    max={30}
                    className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs text-center font-bold focus:border-[#d4af37] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1">
                    رقم الهاتف / الاتصال
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0550..."
                    className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs focus:border-[#d4af37] outline-hidden placeholder-[#555]"
                  />
                </div>
              </div>

              {/* Class Assignment Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1.5 flex items-center justify-between">
                  <span>إسناد الأفواج التربوية (حدد الأقسام التي يدرسها)</span>
                  <span className="text-[11px] text-[#d4af37] font-bold">
                    المحدد: {formAssignedClasses.length} أقسام
                  </span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 p-3 bg-[#121212] rounded-xl border border-[#222] max-h-40 overflow-y-auto">
                  {classes.map((cls) => {
                    const isSelected = formAssignedClasses.includes(cls.id);
                    return (
                      <button
                        type="button"
                        key={cls.id}
                        onClick={() => toggleClassAssignment(cls.id)}
                        className={`p-2 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#d4af37] text-black shadow-md'
                            : 'bg-[#1a1a1a] text-[#aaa] border border-[#2a2a2a] hover:bg-[#222]'
                        }`}
                      >
                        {cls.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1">
                  ملاحظات ومهام إضافية
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="مثال: منسق المادة، مكلف بالسنة الرابعة..."
                  className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs focus:border-[#d4af37] outline-hidden placeholder-[#555]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-[#888] hover:bg-[#141414] rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-5 py-2 bg-[#d4af37] hover:bg-[#c59e2e] text-black text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ الأستاذ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Import Modal */}
      {showAiImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0a0a0a] rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#222] space-y-4">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#d4af37]" />
                <h3 className="font-bold text-[#d4af37] text-base">
                  استيراد واستخراج الأساتذة الذكي بواسطة DALI AI
                </h3>
              </div>
              <button
                onClick={() => setShowAiImportModal(false)}
                className="w-7 h-7 rounded-full bg-[#141414] hover:bg-[#222] border border-[#333] flex items-center justify-center text-[#aaa] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#888] leading-relaxed">
              انسخ والصق قائمة الأساتذة بأي صيغة (نص حر، جدول Excel، قائمة إسناد الأفواج) وسيقوم
              Gemini AI باستخراج الأسماء، المواد، والأفواج المسندة آلياً ودمجها في النظام.
            </p>

            <textarea
              rows={6}
              value={rawRosterText}
              onChange={(e) => setRawRosterText(e.target.value)}
              placeholder="مثال:
أ. بن علي أحمد - مادة الرياضيات - يدرس 1AM1 و 1AM2 و 2AM1
أ. فاطمة بوثلجة - لغة فرنسية - 3AM1, 3AM2, 4AM1
أ. كمال لعريبي - تربية بدنية - 18 سا..."
              className="w-full p-3 bg-[#121212] border border-[#222] text-white rounded-xl text-xs font-mono focus:border-[#d4af37] outline-hidden placeholder-[#555]"
            />

            {aiImportError && (
              <div className="p-3 bg-[#2a0e0e] border border-[#f87171]/40 rounded-xl text-xs text-[#f87171]">
                {aiImportError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAiImportModal(false)}
                className="px-4 py-2 text-xs text-[#888] hover:bg-[#141414] rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleRunAiImport}
                disabled={isAiImporting || !rawRosterText.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] disabled:opacity-50 text-black text-xs font-bold rounded-xl shadow-lg cursor-pointer"
              >
                {isAiImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>جار المعالجة بالذكاء الاصطناعي...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>معالجة واستخراج الأساتذة</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
