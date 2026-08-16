import React, { useState } from 'react';
import {
  Scale,
  Shield,
  CheckCircle,
  XCircle,
  Plus,
  BookOpen,
  Filter,
  Sparkles,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import { LegalRule } from '../types';

interface Props {
  legalRules: LegalRule[];
  onToggleRule: (ruleId: string) => void;
  onAddRule: (newRule: LegalRule) => void;
}

export const LegalRulesView: React.FC<Props> = ({
  legalRules,
  onToggleRule,
  onAddRule,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'hard' | 'pedagogical' | 'soft'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New rule state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSource, setNewSource] = useState('النظام الداخلي للمؤسسة');
  const [newType, setNewType] = useState<LegalRule['type']>('hard');
  const [newPriority, setNewPriority] = useState(5);

  const filteredRules = legalRules.filter((r) => {
    if (filterType === 'all') return true;
    return r.type === filterType;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created: LegalRule = {
      id: `custom-rule-${Date.now()}`,
      title: newTitle,
      description: newDesc,
      source: newSource,
      level: 'all',
      subject: 'all',
      type: newType,
      priority: Number(newPriority),
      active: true,
    };

    onAddRule(created);
    setNewTitle('');
    setNewDesc('');
    setShowAddModal(false);
  };

  return (
    <div id="legal-rules-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0a0a0a] text-white rounded-2xl p-6 shadow-xl border border-[#222] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#141414] border border-[#d4af37]/40 rounded-full text-[#d4af37] text-xs font-semibold mb-2">
            <Scale className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>LEGAL RULE ENGINE — محرك القوانين والقرارات</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#d4af37]">
            منظومة القواعد والقيود البيداغوجية والتنظيمية
          </h2>
          <p className="text-[#888] text-xs md:text-sm mt-1 max-w-2xl">
            يتم تطبيق هذه القوانين الصارمة آلياً بواسطة محرك CSP لضمان انعدام التعارضات ومطابقة الجداول
            للمناشير الوزارية الرسمية.
          </p>
        </div>

        <button
          id="add-custom-legal-rule-btn"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة قاعدة مؤسسية</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filterType === 'all'
              ? 'bg-[#d4af37] text-black font-bold shadow-xs'
              : 'bg-[#0a0a0a] text-[#888] hover:bg-[#141414] border border-[#222]'
          }`}
        >
          جميع القواعد ({legalRules.length})
        </button>
        <button
          onClick={() => setFilterType('hard')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filterType === 'hard'
              ? 'bg-[#d4af37] text-black font-bold shadow-xs'
              : 'bg-[#0a0a0a] text-[#888] hover:bg-[#141414] border border-[#222]'
          }`}
        >
          قيود حتمية ملزمة (Hard Constraints)
        </button>
        <button
          onClick={() => setFilterType('pedagogical')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filterType === 'pedagogical'
              ? 'bg-[#d4af37] text-black font-bold shadow-xs'
              : 'bg-[#0a0a0a] text-[#888] hover:bg-[#141414] border border-[#222]'
          }`}
        >
          قواعد بيداغوجية وتربوية
        </button>
        <button
          onClick={() => setFilterType('soft')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filterType === 'soft'
              ? 'bg-[#d4af37] text-black font-bold shadow-xs'
              : 'bg-[#0a0a0a] text-[#888] hover:bg-[#141414] border border-[#222]'
          }`}
        >
          تفضيلات مرنة (Soft Constraints)
        </button>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRules.map((rule) => {
          return (
            <div
              key={rule.id}
              className={`p-5 rounded-2xl border transition-all ${
                rule.active
                  ? 'bg-[#0a0a0a] border-[#222] shadow-xl hover:border-[#d4af37]/40'
                  : 'bg-[#060606] border-[#181818] opacity-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                      rule.type === 'hard'
                        ? 'bg-[#2a0e0e] text-[#f87171] border border-[#f87171]/30'
                        : rule.type === 'pedagogical'
                        ? 'bg-[#0d1f14] text-[#4ade80] border border-[#4ade80]/30'
                        : 'bg-[#141414] text-[#d4af37] border border-[#d4af37]/30'
                    }`}
                  >
                    {rule.type === 'hard'
                      ? 'قيد حتمي إلزام'
                      : rule.type === 'pedagogical'
                      ? 'توجيه بيداغوجي'
                      : 'تفضيل تنظيمي'}
                  </span>
                  <span className="text-[11px] text-[#888] font-semibold bg-[#141414] border border-[#222] px-2 py-0.5 rounded">
                    أولوية: {rule.priority}/5
                  </span>
                </div>

                {/* Toggle switch */}
                <button
                  id={`toggle-rule-${rule.id}`}
                  onClick={() => onToggleRule(rule.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    rule.active ? 'bg-[#d4af37]' : 'bg-[#222]'
                  }`}
                  role="switch"
                  aria-checked={rule.active}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-sm ring-0 transition duration-200 ease-in-out ${
                      rule.active ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <h3 className="font-bold text-white text-base mb-1">
                {rule.title}
              </h3>
              <p className="text-xs text-[#888] leading-relaxed mb-3">
                {rule.description}
              </p>

              <div className="pt-2.5 border-t border-[#222] flex items-center justify-between text-[11px] text-[#888]">
                <div className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span className="font-medium text-[#aaa]">{rule.source}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold">
                  {rule.active ? (
                    <span className="text-[#4ade80] flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> مفعلة
                    </span>
                  ) : (
                    <span className="text-[#666] flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> معطلة
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0a0a0a] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#222] space-y-4">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <h3 className="font-bold text-[#d4af37] text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#d4af37]" />
                <span>إضافة قاعدة تنظيمية أو بيداغوجية جديدة</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-[#141414] hover:bg-[#222] border border-[#333] flex items-center justify-center text-[#aaa] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1">
                  عنوان القاعدة
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: تفريغ صبيحة الخميس لأساتذة مادة معينة..."
                  className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs focus:border-[#d4af37] outline-hidden placeholder-[#555]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1">
                  نص ووصف القاعدة
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="شرح الشرط البرمجي وكيفية تطبيقه على الجداول..."
                  className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs focus:border-[#d4af37] outline-hidden placeholder-[#555]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1">
                    نوع القيد
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs focus:border-[#d4af37] outline-hidden"
                  >
                    <option value="hard">حتمي وإلزامي (Hard)</option>
                    <option value="pedagogical">بيداغوجي وتربوي</option>
                    <option value="soft">تفضيل مرن (Soft)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1">
                    الأولوية (1 - 5)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newPriority}
                    onChange={(e) => setNewPriority(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs text-center font-bold focus:border-[#d4af37] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1">
                  المصدر التنظيمي
                </label>
                <input
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full p-2.5 bg-[#121212] border border-[#222] text-white rounded-xl text-xs focus:border-[#d4af37] outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-[#888] hover:bg-[#141414] rounded-xl font-medium cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#d4af37] hover:bg-[#c59e2e] text-black text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  حفظ القاعدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
