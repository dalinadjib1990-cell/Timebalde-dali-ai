import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
  Clock,
  History,
  ArrowRight,
  HelpCircle,
  Cpu,
  Layers,
  Check,
} from 'lucide-react';
import {
  TimetableSlot,
  SchoolClass,
  Teacher,
  Room,
  SubjectRule,
  InstitutionConfig,
  Conflict,
  VoiceCommandActionType,
  VoiceCommandExecutionResult,
  VoiceCommandLogItem,
} from '../types';
import { speechRecognitionService } from '../services/speechRecognitionService';
import { speechSynthesisService } from '../services/speechSynthesisService';
import { executeVoiceCommandWithGeminiFallback, interpretVoiceCommand } from '../services/voiceScheduleEngine';
import { soundManager } from '../services/soundService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  slots: TimetableSlot[];
  classes: SchoolClass[];
  teachers: Teacher[];
  rooms: Room[];
  rules: SubjectRule[];
  config: InstitutionConfig;
  conflicts: Conflict[];
  onApplyUpdatedSlots: (newSlots: TimetableSlot[], message: string) => void;
  onSaveVersion?: (name?: string, notes?: string) => void;
}

export const VoiceAssistantModal: React.FC<Props> = ({
  isOpen,
  onClose,
  slots,
  classes,
  teachers,
  rooms,
  rules,
  config,
  conflicts,
  onApplyUpdatedSlots,
  onSaveVersion,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('انقر على الميكروفون وتحدث لتنفيذ أي أمر فوراً');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechFeedbackEnabled, setSpeechFeedbackEnabled] = useState(() => speechSynthesisService.getIsEnabled());
  const [lastResult, setLastResult] = useState<VoiceCommandExecutionResult | null>(null);
  const [commandHistory, setCommandHistory] = useState<VoiceCommandLogItem[]>(() => {
    const saved = localStorage.getItem('dali_voice_command_history');
    return saved ? JSON.parse(saved) : [];
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('dali_voice_command_history', JSON.stringify(commandHistory.slice(0, 15)));
  }, [commandHistory]);

  useEffect(() => {
    if (!isOpen) {
      speechRecognitionService.stop();
      speechSynthesisService.stop();
      setIsListening(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle Voice Recognition
  const handleToggleListening = () => {
    if (isListening) {
      speechRecognitionService.stop();
      setIsListening(false);
      setStatusMessage('تم إيقاف الاستماع');
      soundManager.playToggle(false);
    } else {
      soundManager.playToggle(true);
      setStatusMessage('🔴 أستمع إليك الآن... تفضل بالكلام يا سيدي المدير');
      setInterimTranscript('');
      
      const success = speechRecognitionService.start(
        (text, isFinal) => {
          if (isFinal) {
            setTranscript(text);
            setInterimTranscript('');
            setIsListening(false);
            executeSpokenCommand(text);
          } else {
            setInterimTranscript(text);
          }
        },
        (status, errMessage) => {
          if (status === 'error') {
            setIsListening(false);
            setStatusMessage(errMessage || 'حدث خطأ في الميكروفون');
          } else if (status === 'listening') {
            setIsListening(true);
          } else if (status === 'idle') {
            setIsListening(false);
          }
        }
      );

      if (!success) {
        setIsListening(false);
        setStatusMessage('يرجى السماح بالوصول إلى الميكروفون أو كتابة الأمر بالأسفل');
      }
    }
  };

  // Execute Command (spoken or typed)
  const executeSpokenCommand = async (commandText: string) => {
    if (!commandText.trim()) return;

    setIsExecuting(true);
    setStatusMessage('⚡ جارٍ تفسير الأمر وتنفيذه فوراً في استعمال الزمن...');
    soundManager.playGenerateStart();

    try {
      const result = await executeVoiceCommandWithGeminiFallback(
        commandText,
        slots,
        classes,
        teachers,
        rooms,
        rules,
        config,
        onSaveVersion
      );

      setLastResult(result);
      setIsExecuting(false);

      if (result.success) {
        soundManager.playGenerateSuccess();
        onApplyUpdatedSlots(result.updatedSlots, result.displayMessage);
        setStatusMessage(`✅ ${result.displayMessage}`);

        // Save into history log
        const logItem: VoiceCommandLogItem = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('ar-DZ'),
          transcript: commandText,
          action: result.action,
          spokenFeedback: result.spokenFeedback,
          success: true,
          previousSlotsBackup: result.previousSlots,
        };
        setCommandHistory((prev) => [logItem, ...prev]);

        // Speak back voice response
        if (speechFeedbackEnabled) {
          setIsSpeaking(true);
          speechSynthesisService.speak(result.spokenFeedback, () => {
            setIsSpeaking(false);
          });
        }
      } else {
        setStatusMessage(`⚠️ ${result.displayMessage}`);
        if (speechFeedbackEnabled) {
          setIsSpeaking(true);
          speechSynthesisService.speak(result.spokenFeedback, () => {
            setIsSpeaking(false);
          });
        }
      }
    } catch (e: any) {
      console.error('Voice execution error:', e);
      setIsExecuting(false);
      setStatusMessage('حدث خطأ أثناء معالجة الأمر');
    }
  };

  // Undo Command from History
  const handleUndo = (item: VoiceCommandLogItem) => {
    if (item.previousSlotsBackup) {
      onApplyUpdatedSlots(item.previousSlotsBackup, 'تم التراجع عن الأمر واستعادة الجدول السابق.');
      soundManager.playToggle(true);
      const undoSpeech = 'سيدي المدير، تم التراجع عن الأمر السابق وإعادة الجدول إلى حالته السابقة فوراً.';
      setStatusMessage(`↩️ تم التراجع عن أمر: "${item.transcript}"`);
      if (speechFeedbackEnabled) {
        speechSynthesisService.speak(undoSpeech);
      }
    }
  };

  // Quick Preset Prompts
  const quickVoicePrompts = [
    'انقل حصة الرياضيات للقسم 4AM1 إلى يوم الأحد الحصة 1',
    'حرك حصة العلوم للقسم 1AM2 إلى يوم الاثنين الحصة 3',
    'بدل حصة الفيزياء مع حصة الفرنسية للقسم 3AM1',
    'احذف حصة التربية البدنية يوم الخميس الحصة 4 للقسم 2AM1',
    'فرغ مساء الثلاثاء لجميع الأساتذة',
    'قلل الساعات الفارغة البينية وسد فراغ الساعتين',
    'ولد خيار جديد لاستعمال الزمن',
    'احفظ هذا الجدول كنسخة رسمية معتمدة',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0c0c0c] border border-[#d4af37]/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#222] flex items-center justify-between bg-gradient-to-r from-[#121212] via-[#161616] to-[#121212]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] shadow-inner">
              <Mic className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">المساعد الصوتي الفوري للمدير</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40">
                  تحكم فوري 100%
                </span>
              </div>
              <p className="text-xs text-[#888] mt-0.5">
                تحدث بحرية لتحريك أي حصة، تبديلها، سد الفراغات، أو التوليد الآلي بضغطة زر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#777] hover:text-white hover:bg-[#222] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Main Microphone Interaction Circle */}
          <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-b from-[#141414] to-[#0d0d0d] border border-[#222] rounded-3xl relative overflow-hidden shadow-inner">
            {/* Background Pulsing Circles when listening */}
            {isListening && (
              <>
                <div className="absolute w-44 h-44 rounded-full bg-red-500/10 animate-ping" />
                <div className="absolute w-36 h-36 rounded-full bg-[#d4af37]/15 animate-pulse" />
              </>
            )}

            <button
              onClick={handleToggleListening}
              disabled={isExecuting}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                isListening
                  ? 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-red-600/50 scale-110 ring-4 ring-red-500/30'
                  : 'bg-gradient-to-br from-[#d4af37] to-[#b39226] text-black hover:scale-105 shadow-[#d4af37]/30'
              }`}
            >
              {isListening ? (
                <MicOff className="w-10 h-10 animate-bounce" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </button>

            {/* Status & Speech Feedback */}
            <div className="mt-4 text-center px-4 max-w-md">
              <div className="text-sm font-bold text-white flex items-center justify-center gap-2">
                {isExecuting ? (
                  <span className="inline-block w-2 h-2 rounded-full bg-[#d4af37] animate-ping" />
                ) : isListening ? (
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping" />
                ) : (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                )}
                <span>{statusMessage}</span>
              </div>

              {/* Live speech transcription */}
              {(transcript || interimTranscript) && (
                <div className="mt-3 p-3 rounded-xl bg-[#1a1a1a] border border-[#333] text-sm text-[#d4af37] font-medium animate-in fade-in">
                  "{transcript || interimTranscript}"
                </div>
              )}
            </div>

            {/* Voice Feedback Speaker Toggle */}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = speechSynthesisService.toggleEnabled();
                  setSpeechFeedbackEnabled(next);
                  soundManager.playToggle(next);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  speechFeedbackEnabled
                    ? 'bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/40'
                    : 'bg-[#181818] text-[#777] border-[#2a2a2a]'
                }`}
              >
                {speechFeedbackEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>الرد الصوتي الذكي: مفعّل 🔊</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>الرد الصوتي: مكتوم 🔇</span>
                  </>
                )}
              </button>

              {lastResult?.spokenFeedback && (
                <button
                  type="button"
                  onClick={() => speechSynthesisService.speak(lastResult.spokenFeedback)}
                  className="px-2.5 py-1.5 rounded-full text-xs bg-[#222] hover:bg-[#333] text-[#ccc] border border-[#333] flex items-center gap-1.5"
                  title="إعادة الاستماع لرد المساعد"
                >
                  <Play className="w-3 h-3" />
                  <span>إعادة النطق</span>
                </button>
              )}
            </div>
          </div>

          {/* Last Result Execution Card */}
          {lastResult && (
            <div
              className={`p-4 rounded-2xl border transition-all ${
                lastResult.success
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/20 border-amber-500/40 text-amber-300'
              }`}
            >
              <div className="flex items-start gap-3">
                {lastResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#888]">
                    نتيجة التنفيذ الفوري
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {lastResult.displayMessage}
                  </div>
                  <div className="text-xs text-[#aaa] italic">
                    "{lastResult.spokenFeedback}"
                  </div>

                  {lastResult.targetSlot && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-[#222] text-[#d4af37] border border-[#d4af37]/30">
                        {classes.find((c) => c.id === lastResult.targetSlot?.classId)?.name || lastResult.targetSlot?.classId}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#222] text-white">
                        {lastResult.targetSlot?.day}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#222] text-white">
                        الحصة {lastResult.targetSlot?.period}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manual Input (Hybrid Voice or Text) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#aaa] flex items-center justify-between">
              <span>أو اكتب الأمر يدوياً لتنفيذه فوراً:</span>
              <span className="text-[11px] text-[#666]">يدعم اللهجة الجزائرية والفصحى</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    executeSpokenCommand(transcript);
                  }
                }}
                placeholder="مثال: انقل حصة الرياضيات للقسم 4AM1 إلى الأحد الحصة 1..."
                className="flex-1 bg-[#141414] border border-[#2a2a2a] focus:border-[#d4af37] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              />
              <button
                onClick={() => executeSpokenCommand(transcript)}
                disabled={isExecuting || !transcript.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c29f2e] text-black font-bold text-sm flex items-center gap-2 disabled:opacity-50 transition-all shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>تنفيذ</span>
              </button>
            </div>
          </div>

          {/* Quick Voice Command Chips */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#888] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>أوامر صوتية نموذجية جاهزة للتجربة الفورية:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickVoicePrompts.map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTranscript(cmd);
                    executeSpokenCommand(cmd);
                  }}
                  className="text-right p-2.5 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#222] hover:border-[#d4af37]/40 text-xs text-[#ccc] hover:text-white transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{cmd}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#666] group-hover:text-[#d4af37] shrink-0 mr-2" />
                </button>
              ))}
            </div>
          </div>

          {/* Execution History & Undo */}
          {commandHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#222]">
              <div className="flex items-center justify-between text-xs text-[#888]">
                <div className="flex items-center gap-1.5 font-bold">
                  <History className="w-3.5 h-3.5" />
                  <span>سجل الأوامر الصوتية المنفذة:</span>
                </div>
                <button
                  onClick={() => setCommandHistory([])}
                  className="text-[11px] text-[#666] hover:text-[#999]"
                >
                  مسح السجل
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {commandHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#121212] border border-[#222] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">"{item.transcript}"</div>
                      <div className="text-[11px] text-[#888] flex items-center gap-2">
                        <span>{item.timestamp}</span>
                        <span>•</span>
                        <span className="text-emerald-400">{item.action}</span>
                      </div>
                    </div>
                    {item.previousSlotsBackup && (
                      <button
                        onClick={() => handleUndo(item)}
                        className="px-2.5 py-1 rounded-lg bg-[#222] hover:bg-amber-950/40 text-[#aaa] hover:text-amber-300 border border-[#333] hover:border-amber-500/40 flex items-center gap-1 text-[11px] font-bold shrink-0 transition-all"
                        title="التراجع عن هذا الأمر واستعادة الجدول السابق"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>تراجع</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#222] bg-[#0f0f0f] flex items-center justify-between text-xs text-[#777]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#d4af37]" />
            <span>محرك DALI VOICE AI 2026/2027 — فك التعارض والتنفيذ التلقائي النشط</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#222] hover:bg-[#333] text-white font-bold transition-all"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
