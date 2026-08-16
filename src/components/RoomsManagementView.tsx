import React, { useState } from 'react';
import {
  DoorClosed,
  Plus,
  Trash2,
  Edit2,
  Microscope,
  Atom,
  Monitor,
  Trophy,
  Palette,
  Layers,
  Users,
} from 'lucide-react';
import { Room } from '../types';

interface Props {
  rooms: Room[];
  onAddRoom: (room: Room) => void;
  onUpdateRoom: (room: Room) => void;
  onDeleteRoom: (roomId: string) => void;
}

export const RoomsManagementView: React.FC<Props> = ({
  rooms,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Form
  const [name, setName] = useState('');
  const [type, setType] = useState<Room['type']>('regular');
  const [capacity, setCapacity] = useState(40);
  const [isShared, setIsShared] = useState(false);

  const filteredRooms = rooms.filter((r) => {
    if (selectedType === 'all') return true;
    return r.type === selectedType;
  });

  const handleOpenAdd = () => {
    setName('');
    setType('regular');
    setCapacity(40);
    setIsShared(false);
    setEditingRoom(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setName(room.name);
    setType(room.type);
    setCapacity(room.capacity);
    setIsShared(room.isShared);
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingRoom) {
      onUpdateRoom({
        ...editingRoom,
        name,
        type,
        capacity: Number(capacity),
        isShared,
      });
    } else {
      onAddRoom({
        id: `room-${Date.now().toString().slice(-4)}`,
        name,
        type,
        capacity: Number(capacity),
        isShared,
      });
    }
    setShowAddModal(false);
  };

  const getRoomIcon = (rType: Room['type']) => {
    switch (rType) {
      case 'science_lab':
        return <Microscope className="w-5 h-5 text-emerald-600" />;
      case 'physics_lab':
        return <Atom className="w-5 h-5 text-blue-600" />;
      case 'computer_lab':
        return <Monitor className="w-5 h-5 text-purple-600" />;
      case 'sports_ground':
        return <Trophy className="w-5 h-5 text-amber-600" />;
      case 'art_room':
        return <Palette className="w-5 h-5 text-pink-600" />;
      default:
        return <DoorClosed className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div id="rooms-management-view" className="space-y-6">
      {/* Header */}
      <div className="bg-[#0a0a0a] text-white rounded-2xl p-6 shadow-xl border border-[#222] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#141414] border border-[#d4af37]/40 rounded-full text-[#d4af37] text-xs font-semibold mb-2">
            <DoorClosed className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>الهياكل والتجهيزات البيداغوجية</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#d4af37]">
            القاعات، المخابر، وورشات الأنشطة ({rooms.length} هيكلاً)
          </h2>
          <p className="text-[#888] text-xs md:text-sm mt-1 max-w-2xl">
            إلزام النظام بحجز المخابر المتخصصة لحصص التجارب (TP) وفقاً للبند رقم 2 من الوثيقة
            الوزارية.
          </p>
        </div>

        <button
          id="add-new-room-btn"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة قاعة أو مخبر</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedType('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedType === 'all'
              ? 'bg-[#d4af37] text-black font-bold'
              : 'bg-[#0a0a0a] text-[#888] hover:bg-[#141414] border border-[#222]'
          }`}
        >
          الكل ({rooms.length})
        </button>
        <button
          onClick={() => setSelectedType('regular')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedType === 'regular'
              ? 'bg-[#d4af37] text-black font-bold'
              : 'bg-[#0a0a0a] text-[#888] hover:bg-[#141414] border border-[#222]'
          }`}
        >
          قاعات تدريس عادية
        </button>
        <button
          onClick={() => setSelectedType('science_lab')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedType === 'science_lab'
              ? 'bg-[#d4af37] text-black font-bold'
              : 'bg-[#0a0a0a] text-[#888] hover:bg-[#141414] border border-[#222]'
          }`}
        >
          مخابر علوم الطبيعة
        </button>
        <button
          onClick={() => setSelectedType('physics_lab')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedType === 'physics_lab'
              ? 'bg-[#d4af37] text-black font-bold'
              : 'bg-[#0a0a0a] text-[#888] hover:bg-[#141414] border border-[#222]'
          }`}
        >
          مخابر العلوم الفيزيائية
        </button>
        <button
          onClick={() => setSelectedType('computer_lab')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedType === 'computer_lab'
              ? 'bg-[#d4af37] text-black font-bold'
              : 'bg-[#0a0a0a] text-[#888] hover:bg-[#141414] border border-[#222]'
          }`}
        >
          قاعات الإعلام الآلي
        </button>
        <button
          onClick={() => setSelectedType('sports_ground')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedType === 'sports_ground'
              ? 'bg-[#d4af37] text-black font-bold'
              : 'bg-[#0a0a0a] text-[#888] hover:bg-[#141414] border border-[#222]'
          }`}
        >
          ميادين التربية البدنية
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredRooms.map((r) => (
          <div
            key={r.id}
            className="bg-[#0a0a0a] rounded-2xl p-5 border border-[#222] shadow-xl hover:border-[#d4af37]/40 transition-all space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#222] flex items-center justify-center">
                {getRoomIcon(r.type)}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(r)}
                  className="p-1.5 text-[#888] hover:text-[#d4af37] hover:bg-[#141414] rounded-lg transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`هل أنت متأكد من حذف ${r.name}؟`)) {
                      onDeleteRoom(r.id);
                    }
                  }}
                  className="p-1.5 text-[#888] hover:text-[#f87171] hover:bg-[#2a0e0e] rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-white text-base">{r.name}</h3>
              <span className="text-[11px] text-[#888] font-medium">
                {r.type === 'science_lab'
                  ? 'مخبر علوم الطبيعة والحياة'
                  : r.type === 'physics_lab'
                  ? 'مخبر العلوم الفيزيائية والتكنولوجيا'
                  : r.type === 'computer_lab'
                  ? 'قاعة الإعلام الآلي والمعلوماتية'
                  : r.type === 'sports_ground'
                  ? 'ميدان وفناء التربية البدنية'
                  : r.type === 'art_room'
                  ? 'ورشة التربية الفنية والموسيقية'
                  : 'قاعة تدريس عامة'}
              </span>
            </div>

            <div className="pt-2 border-t border-[#222] flex items-center justify-between text-xs text-[#888]">
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#666]" />
                <span>السعة: <strong className="text-white">{r.capacity} مقعداً</strong></span>
              </div>
              <div>
                {r.isShared ? (
                  <span className="text-[#d4af37] bg-[#1a120a] border border-[#d4af37]/30 px-2 py-0.5 rounded text-[11px] font-semibold">
                    مشتركة
                  </span>
                ) : (
                  <span className="text-[#4ade80] bg-[#1a2e1a] border border-[#4ade80]/30 px-2 py-0.5 rounded text-[11px] font-semibold">
                    مخصصة
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0a0a0a] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#222] space-y-4">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <h3 className="font-bold text-[#d4af37] text-base">
                {editingRoom ? 'تعديل بيانات القاعة / المخبر' : 'إضافة قاعة أو مخبر جديد'}
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
                  اسم القاعة / المخبر
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: مخبر الفيزياء 2 أو قاعة 14"
                  className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs focus:border-[#d4af37] outline-hidden placeholder-[#555]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1">
                    نوع الهيكل
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs focus:border-[#d4af37] outline-hidden"
                  >
                    <option value="regular">قاعة تدريس عامة</option>
                    <option value="science_lab">مخبر علوم طبيعية</option>
                    <option value="physics_lab">مخبر فيزياء</option>
                    <option value="computer_lab">قاعة إعلام آلي</option>
                    <option value="sports_ground">ميدان رياضة</option>
                    <option value="art_room">ورشة رسم وموسيقى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1">
                    السعة (تلميذ)
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    min={5}
                    max={150}
                    className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs text-center font-bold focus:border-[#d4af37] outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is-shared-cb"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="w-4 h-4 text-[#d4af37] rounded"
                />
                <label htmlFor="is-shared-cb" className="text-xs text-[#ccc] font-medium">
                  قاعة / مخبر مشترك بين عدة أفواج
                </label>
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
                  حفظ القاعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
