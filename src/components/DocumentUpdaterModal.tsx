import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { SubjectRule } from '../types';

interface Props {
  currentRules: SubjectRule[];
  onApplyUpdatedRules: (newRules: SubjectRule[]) => void;
  onClose: () => void;
}

export const DocumentUpdaterModal: React.FC<Props> = ({
  currentRules,
  onApplyUpdatedRules,
  onClose,
}) => {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedRules, setExtractedRules] = useState<SubjectRule[] | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setImageBase64(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const handleRunDocumentComparison = async () => {
    if (!imageBase64 && !rawText.trim()) {
      setErrorMsg('يرجى رفع صورة الوثيقة الوزارية أو لصق نص القرار أولاً.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/gemini/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageBase64 || undefined,
          rawText: rawText || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر استخراج بيانات الوثيقة بالذكاء الاصطناعي');
      }

      setExtractedRules(data.extractedRules || []);
      setNotes(data.notes || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء معالجة الوثيقة الوزارية');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAndApply = () => {
    if (extractedRules && extractedRules.length > 0) {
      onApplyUpdatedRules(extractedRules);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-[#0a0a0a] rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-[#222] space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#222] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#d4af37]" />
            <h3 className="font-bold text-[#d4af37] text-base">
              الفحص والمقارنة الذكية للوثائق والمناشير الوزارية (DALI AI OCR)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#141414] hover:bg-[#222] border border-[#333] flex items-center justify-center text-[#aaa] cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-[#888] leading-relaxed">
          يمكنك رفع صورة أي قرار أو منشور وزاري جديد (أو لصق نصه) ليقوم Gemini بالتعرف البصري الدقيق
          على الجداول والمواقيت والمعاملات ومقارنتها بالقواعد الحالية.
        </p>

        {/* Input Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* File Upload Box */}
          <div className="p-4 border-2 border-dashed border-[#333] hover:border-[#d4af37] rounded-2xl text-center space-y-2 transition-colors cursor-pointer relative bg-[#121212]">
            <UploadCloud className="w-8 h-8 mx-auto text-[#d4af37]" />
            <div className="text-xs font-bold text-white">
              {imageBase64 ? '✓ تم اختيار صورة الوثيقة' : 'اضغط لرفع صورة القرار الوزاري'}
            </div>
            <div className="text-[10px] text-[#666]">يدعم صيغ JPG, PNG, PDF</div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>

          {/* Raw Text Paste Box */}
          <div>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="أو انسخ والصق نص القرار الوزاري / المنشور التربوي هنا..."
              className="w-full p-3 bg-[#121212] border border-[#222] text-white rounded-xl text-xs font-mono focus:border-[#d4af37] outline-hidden placeholder-[#555]"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#2a0e0e] border border-[#f87171]/40 rounded-xl text-xs text-[#fca5a5]">
            {errorMsg}
          </div>
        )}

        <div className="flex justify-center pt-2">
          <button
            onClick={handleRunDocumentComparison}
            disabled={isProcessing || (!imageBase64 && !rawText.trim())}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] disabled:opacity-50 text-black font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>جار تحليل الوثيقة ومقارنة الجداول...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black" />
                <span>بدء الفحص المقارن بالذكاء الاصطناعي</span>
              </>
            )}
          </button>
        </div>

        {/* Extracted Comparison Preview */}
        {extractedRules && (
          <div className="p-4 bg-[#0d1f14] rounded-2xl border border-[#4ade80]/40 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-[#4ade80] font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
              <span>نتيجة الفحص المقارن: تم استخراج {extractedRules.length} قاعدة ومادة بنجاح!</span>
            </div>

            {notes.length > 0 && (
              <div className="text-xs text-[#86efac] space-y-1">
                {notes.map((n, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span>•</span>
                    <span>{n}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#4ade80]/20">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs text-[#888] hover:bg-[#141414] rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmAndApply}
                className="px-5 py-2 bg-[#d4af37] hover:bg-[#c59e2e] text-black text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                اعتماد وتحديث المنظومة المرجعية
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
