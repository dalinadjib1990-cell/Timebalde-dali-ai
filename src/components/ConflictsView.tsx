import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Conflict } from '../types';

interface Props {
  conflicts: Conflict[];
  onAutoFixConflict: (conflict: Conflict) => void;
  onAutoFixAll: () => void;
}

export const ConflictsView: React.FC<Props> = ({
  conflicts,
  onAutoFixConflict,
  onAutoFixAll,
}) => {
  const errorConflicts = conflicts.filter((c) => c.severity === 'error');
  const warningConflicts = conflicts.filter((c) => c.severity === 'warning');

  return (
    <div id="conflicts-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0a0a0a] text-white rounded-2xl p-6 shadow-xl border border-[#222] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#141414] border border-[#d4af37]/40 rounded-full text-[#d4af37] text-xs font-semibold mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>REAL-TIME CONFLICT DETECTOR — كاشف التعارضات التلقائي</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#d4af37]">
            تشخيص التعارضات والقيود غير المستوفاة
          </h2>
          <p className="text-[#888] text-xs md:text-sm mt-1 max-w-2xl">
            يقوم النظام بفحص كل حركة زمنية في الجدول للتأكد من عدم وجود تضارب بين الأساتذة، القاعات،
            أو تجاوز للحجم الساعي الوزاري.
          </p>
        </div>

        {conflicts.length > 0 && (
          <button
            id="fix-all-conflicts-btn"
            onClick={onAutoFixAll}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>معالجة وحل جميع التعارضات آلياً</span>
          </button>
        )}
      </div>

      {/* Overview Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-[#222] shadow-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-[#888] font-semibold">مجموع التعارضات</div>
            <div className="text-2xl font-bold text-white mt-1">
              {conflicts.length}
            </div>
          </div>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
              conflicts.length === 0 ? 'bg-[#1a2e1a] text-[#4ade80] border border-[#4ade80]/30' : 'bg-[#2a0e0e] text-[#f87171] border border-[#f87171]/30'
            }`}
          >
            {conflicts.length === 0 ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
        </div>

        <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-[#222] shadow-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-[#888] font-semibold">تعارضات حرجة (أخطاء)</div>
            <div className="text-2xl font-bold text-[#f87171] mt-1">
              {errorConflicts.length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#2a0e0e] text-[#f87171] border border-[#f87171]/30 flex items-center justify-center font-bold">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-[#222] shadow-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-[#888] font-semibold">تنبيهات بيداغوجية</div>
            <div className="text-2xl font-bold text-[#d4af37] mt-1">
              {warningConflicts.length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#1a120a] text-[#d4af37] border border-[#d4af37]/30 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Conflict List */}
      {conflicts.length === 0 ? (
        <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl p-10 text-center space-y-3 shadow-xl">
          <div className="w-16 h-16 bg-[#141414] border border-[#d4af37]/40 text-[#d4af37] rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h3 className="text-lg font-bold text-[#d4af37]">
            استعمال الزمن سليم 100% وخالٍ من أي تعارضات!
          </h3>
          <p className="text-xs text-[#888] max-w-md mx-auto leading-relaxed">
            تمت مراجعة جميع الجداول وهيئة التدريس والقاعات والمخابر والأحجام الساعية الوزارية ولم يُرصد
            أي تضارب.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conflicts.map((conf) => {
            const isError = conf.severity === 'error';
            return (
              <div
                key={conf.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isError
                    ? 'bg-[#150a0a] border-[#3f1616] text-[#fca5a5]'
                    : 'bg-[#141006] border-[#3d2e0f] text-[#fde047]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isError ? 'bg-[#991b1b] text-white' : 'bg-[#d4af37] text-black font-bold'
                    }`}
                  >
                    {isError ? <AlertCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{conf.title}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isError ? 'bg-[#3f1616] text-[#f87171] border border-[#f87171]/30' : 'bg-[#2b1f0a] text-[#d4af37] border border-[#d4af37]/30'
                        }`}
                      >
                        {isError ? 'تعارض حرج' : 'تنبيه تنظيمي'}
                      </span>
                    </div>
                    <p className="text-xs text-[#aaa] mt-1 leading-relaxed">
                      {conf.description}
                    </p>
                    {conf.suggestion && (
                      <div className="text-[11px] text-[#d4af37] mt-1 flex items-center gap-1 font-medium">
                        <span>💡 الحل المقترح:</span>
                        <span>{conf.suggestion}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onAutoFixConflict(conf)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1a1a1a] hover:bg-[#222] text-[#d4af37] border border-[#333] rounded-xl text-xs font-bold shadow-md whitespace-nowrap self-end md:self-auto transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>حل التعارض</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
