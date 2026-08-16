import React, { useState } from 'react';
import {
  GraduationCap,
  Plus,
  Trash2,
  Edit2,
  Users,
  Layers,
  DoorClosed,
  Clock,
  BookOpen,
} from 'lucide-react';
import { SchoolClass, GradeLevel, Room, SubjectRule } from '../types';

interface Props {
  classes: SchoolClass[];
  rooms: Room[];
  rules: SubjectRule[];
  onAddClass: (cls: SchoolClass) => void;
  onUpdateClass: (cls: SchoolClass) => void;
  onDeleteClass: (classId: string) => void;
}

export const ClassesManagementView: React.FC<Props> = ({
  classes,
  rooms,
  rules,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<GradeLevel | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [level, setLevel] = useState<GradeLevel>('1AM');
  const [studentCount, setStudentCount] = useState(35);
  const [assignedRoomId, setAssignedRoomId] = useState('');

  const filteredClasses = classes.filter((c) => {
    if (selectedLevel === 'all') return true;
    return c.level === selectedLevel;
  });

  const handleOpenAdd = () => {
    setName('');
    setLevel('1AM');
    setStudentCount(35);
    setAssignedRoomId(rooms[0]?.id || '');
    setEditingClass(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (cls: SchoolClass) => {
    setEditingClass(cls);
    setName(cls.name);
    setLevel(cls.level);
    setStudentCount(cls.studentCount);
    setAssignedRoomId(cls.assignedRoomId || '');
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingClass) {
      onUpdateClass({
        ...editingClass,
        name,
        level,
        studentCount: Number(studentCount),
        assignedRoomId: assignedRoomId || undefined,
      });
    } else {
      onAddClass({
        id: `cls-${level.toLowerCase()}-${Date.now().toString().slice(-4)}`,
        name,
        level,
        studentCount: Number(studentCount),
        assignedRoomId: assignedRoomId || undefined,
      });
    }
    setShowAddModal(false);
  };

  // Group classes by level for quick stats
  const levelCounts = {
    '1AM': classes.filter((c) => c.level === '1AM').length,
    '2AM': classes.filter((c) => c.level === '2AM').length,
    '3AM': classes.filter((c) => c.level === '3AM').length,
    '4AM': classes.filter((c) => c.level === '4AM').length,
  };

  return (
    <div id="classes-management-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0a0a0a] text-white rounded-2xl p-6 shadow-xl border border-[#222] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#141414] border border-[#d4af37]/40 rounded-full text-[#d4af37] text-xs font-semibold mb-2">
            <GraduationCap className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>الأفواج التربوية والمستويات التعليمية</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#d4af37]">
            إدارة الأقسام التربوية ({classes.length} فوجاً)
          </h2>
          <p className="text-[#888] text-xs md:text-sm mt-1 max-w-2xl">
            يتم تخصيص الحجم الساعي الأسبوعي لكل فوج تلقائياً حسب المستوى الدراسي المستخرج من الوثيقة
            الوزارية الرسمية (28 ساعة أسبوعياً لكل قسم).
          </p>
        </div>

        <button
          id="add-new-class-btn"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة فوج تربوي</span>
        </button>
      </div>

      {/* Level Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setSelectedLevel('all')}
          className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
            selectedLevel === 'all'
              ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-lg font-bold'
              : 'bg-[#0a0a0a] text-white border-[#222] hover:bg-[#141414]'
          }`}
        >
          <div className="text-xs opacity-70">جميع المستويات</div>
          <div className="text-xl font-bold mt-1">{classes.length} فوجاً</div>
        </button>

        {(['1AM', '2AM', '3AM', '4AM'] as GradeLevel[]).map((lvl) => {
          const isSelected = selectedLevel === lvl;
          const weeklyHours = rules
            .filter((r) => r.level === lvl)
            .reduce((sum, r) => sum + r.weekly_hours, 0);

          return (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-lg font-bold'
                  : 'bg-[#0a0a0a] text-white border-[#222] hover:bg-[#141414]'
              }`}
            >
              <div className="text-xs opacity-70">
                {lvl === '1AM'
                  ? 'الأولى متوسط'
                  : lvl === '2AM'
                  ? 'الثانية متوسط'
                  : lvl === '3AM'
                  ? 'الثالثة متوسط'
                  : 'الرابعة متوسط'}
              </div>
              <div className="text-xl font-bold mt-1">{levelCounts[lvl]} أقسام</div>
              <div className="text-[10px] opacity-60 mt-0.5">{weeklyHours} سا/أسبوع رسمياً</div>
            </button>
          );
        })}
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredClasses.map((cls) => {
          const room = rooms.find((r) => r.id === cls.assignedRoomId);
          const classRules = rules.filter((r) => r.level === cls.level);
          const totalHours = classRules.reduce((sum, r) => sum + r.weekly_hours, 0);

          return (
            <div
              key={cls.id}
              className="bg-[#0a0a0a] rounded-2xl p-5 border border-[#222] shadow-xl hover:border-[#d4af37]/40 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 bg-[#141414] border border-[#d4af37]/40 text-[#d4af37] font-bold text-xs rounded-md">
                    {cls.level}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">{cls.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(cls)}
                    className="p-1.5 text-[#888] hover:text-[#d4af37] hover:bg-[#141414] rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`هل أنت متأكد من حذف القسم ${cls.name}؟`)) {
                        onDeleteClass(cls.id);
                      }
                    }}
                    className="p-1.5 text-[#888] hover:text-[#f87171] hover:bg-[#2a0e0e] rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-[#888] pt-2 border-t border-[#222]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[#888]">
                    <Users className="w-3.5 h-3.5" />
                    <span>تعداد التلاميذ:</span>
                  </span>
                  <span className="font-bold text-white">{cls.studentCount} تلميذاً</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[#888]">
                    <DoorClosed className="w-3.5 h-3.5" />
                    <span>القاعة الأساسية:</span>
                  </span>
                  <span className="font-semibold text-[#d4af37]">
                    {room ? room.name : 'غير محددة'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[#888]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>النصاب الوزاري:</span>
                  </span>
                  <span className="font-bold text-white">{totalHours} سا / أسبوع</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0a0a0a] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#222] space-y-4">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <h3 className="font-bold text-[#d4af37] text-base">
                {editingClass ? 'تعديل بيانات الفوج' : 'إضافة فوج تربوي جديد'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-[#141414] hover:bg-[#222] border border-[#333] flex items-center justify-center text-[#aaa] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1">
                  اسم الفوج (القسم)
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: 1AM1 أو 4AM3"
                  className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs focus:border-[#d4af37] outline-hidden placeholder-[#555]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1">
                    المستوى الدراسي
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as GradeLevel)}
                    className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs font-bold focus:border-[#d4af37] outline-hidden"
                  >
                    <option value="1AM">1AM — الأولى متوسط</option>
                    <option value="2AM">2AM — الثانية متوسط</option>
                    <option value="3AM">3AM — الثالثة متوسط</option>
                    <option value="4AM">4AM — الرابعة متوسط</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1">
                    تعداد التلاميذ
                  </label>
                  <input
                    type="number"
                    value={studentCount}
                    onChange={(e) => setStudentCount(Number(e.target.value))}
                    min={10}
                    max={50}
                    className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs text-center font-bold focus:border-[#d4af37] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1">
                  القاعة الدراسية المخصصة
                </label>
                <select
                  value={assignedRoomId}
                  onChange={(e) => setAssignedRoomId(e.target.value)}
                  className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs focus:border-[#d4af37] outline-hidden"
                >
                  <option value="">-- بدون قاعة محددة --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.type === 'regular' ? 'قاعة عادية' : 'مخبر/ورشة'})
                    </option>
                  ))}
                </select>
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
                  className="px-5 py-2 bg-[#d4af37] hover:bg-[#c59e2e] text-black text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  حفظ الفوج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
