import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Trash2,
} from 'lucide-react';
import {
  TimetableSlot,
  SchoolClass,
  Teacher,
  Room,
  SubjectRule,
  InstitutionConfig,
} from '../types';
import {
  executeInterconnectedTimetableCommand,
  ChatMessage,
  ChatCommandResult,
} from '../services/aiTimetableChatEngine';

interface Props {
  slots: TimetableSlot[];
  classes: SchoolClass[];
  teachers: Teacher[];
  rooms: Room[];
  rules: SubjectRule[];
  config: InstitutionConfig;
  onApplyUpdatedSlots: (newSlots: TimetableSlot[], message: string) => void;
}

export const AiChatBubble: React.FC<Props> = ({
  slots,
  classes,
  teachers,
  rooms,
  rules,
  config,
  onApplyUpdatedSlots,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Pre-loaded initial welcome message
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: `مرحباً بك حضرة المدير! 🧠
أنا **المستشار الذكي لإدارة واستعمال الزمن كتابياً**.
يمكنك إصدار أوامرك لي باللغة العربية المباشرة، وسأقوم بتعديل الحصص ونقلها مع **الترابط التام لجميع الجداول** (جدول القسم، جدول الأستاذ، جدول القاعة، والمخابر) فورياً وبدون أي تعارض أو خلل!`,
        timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
        actionResult: {
          success: true,
          actionType: 'general_advice',
          message: 'المحرك متصل ومترابط مع كافة جداول المؤسسة.',
          detailsList: [
            'التحكم الكتابي الفوري في نقل وتبديل الحصص.',
            'ترابط كامل: تحريك أي حصة يحدث جداول القسم والأستاذ والقاعة معاً.',
            'مبادلة ذكية تلقائية في حال كانت الخانة المستهدفة مشغولة.',
            'التزام تام بإنهاء الدروس النظامية على 15:00 وحصر الحصة 7 للاستدراك.',
          ],
        },
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      const result: ChatCommandResult = await executeInterconnectedTimetableCommand(
        text,
        slots,
        classes,
        teachers,
        rooms,
        rules,
        config
      );

      // If updated slots were returned, apply to the global state immediately!
      if (result.updatedSlots && result.updatedSlots.length > 0) {
        onApplyUpdatedSlots(result.updatedSlots, result.message);
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: result.message,
        timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
        actionResult: result,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'حدث خطأ غير متوقع أثناء معالجة الأمر. يرجى المحاولة مرة أخرى بصيغة واضحة.',
        timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: 'تم مسح المحادثة. يمكنك كتابة أوامرك لتعديل الجداول كتابياً في أي وقت.',
        timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const quickPrompts = [
    'انقل حصة الرياضيات لقسم 4AM1 إلى الاثنين الحصة 2',
    'بادل بين حصة العلوم والفيزياء لقسم 2AM1',
    'فرغ يوم الأربعاء لأستاذ الرياضيات',
    'حرك حصة الاستدراك إلى يوم الخميس الحصة 7',
    'تأكد من ترابط الجداول وحل التعارضات',
  ];

  return (
    <>
      {/* Floating Trigger Bubble Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        {!isOpen && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#0f0f0f]/95 text-white border border-[#d4af37]/40 rounded-full text-xs font-bold shadow-2xl animate-in fade-in slide-in-from-right-4 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>المساعد الذكي كتابياً (تحكم بالترابط)</span>
          </div>
        )}

        <button
          id="ai-chat-bubble-trigger"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 cursor-pointer relative group ${
            isOpen
              ? 'bg-[#1a1a1a] text-[#888] hover:text-white border border-[#333]'
              : 'bg-gradient-to-tr from-[#b8860b] via-[#d4af37] to-[#f59e0b] text-black hover:scale-110 active:scale-95 border-2 border-white/20'
          }`}
          title="افتح المساعد الذكي لإدارة الجداول كتابياً"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <MessageSquare className="w-7 h-7 drop-shadow" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-black rounded-full" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-ping opacity-75" />
            </>
          )}
        </button>
      </div>

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div
          className={`fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col bg-[#0c0c0c] border border-[#2a2a2a] rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-8 ${
            isExpanded
              ? 'w-[95vw] sm:w-[650px] h-[82vh]'
              : 'w-[92vw] sm:w-[460px] h-[600px] max-h-[78vh]'
          }`}
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#141414] via-[#111] to-[#181818] border-b border-[#222] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#d4af37] to-[#f59e0b] flex items-center justify-center text-black font-extrabold shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>المستشار الذكي (تحكم كتابي)</span>
                  <span className="px-2 py-0.2 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-bold">
                    ترابط فوري
                  </span>
                </h3>
                <p className="text-[11px] text-[#888]">
                  تعديل ونقل الحصص مع ترابط كامل لكافة الجداول ودون أي تعارض
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-[#888] hover:text-white hover:bg-[#222] rounded-lg transition-colors cursor-pointer"
                title={isExpanded ? 'تصغير النافذة' : 'تكبير النافذة'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleClearChat}
                className="p-1.5 text-[#888] hover:text-red-400 hover:bg-[#222] rounded-lg transition-colors cursor-pointer"
                title="مسح المحادثة"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[#888] hover:text-white hover:bg-[#222] rounded-lg transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2.5 bg-[#0f0f0f] border-b border-[#222] overflow-x-auto flex items-center gap-2 no-scrollbar">
            <span className="text-[10px] text-[#777] shrink-0 font-bold">اقتراحات سريعة:</span>
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isProcessing}
                className="shrink-0 text-[11px] px-2.5 py-1 bg-[#181818] hover:bg-[#222] text-[#ccc] hover:text-[#d4af37] border border-[#2a2a2a] rounded-lg transition-all cursor-pointer truncate max-w-[210px]"
                title={prompt}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#080808]">
            {messages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'} space-y-1.5`}
                >
                  <div className="flex items-center gap-2 text-[10px] text-[#666] px-1">
                    <span>{isAssistant ? 'المستشار الذكي' : 'السيد المدير'}</span>
                    <span>•</span>
                    <span className="font-mono">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[88%] shadow-md whitespace-pre-wrap ${
                      isAssistant
                        ? 'bg-[#141414] text-[#ddd] border border-[#222] rounded-tr-none'
                        : 'bg-gradient-to-r from-[#b8860b] to-[#d4af37] text-black font-semibold rounded-tl-none'
                    }`}
                  >
                    {msg.text}

                    {/* Action Execution Card */}
                    {isAssistant && msg.actionResult && msg.actionResult.actionType !== 'general_advice' && (
                      <div className="mt-2.5 p-2.5 bg-[#0a0a0a] border border-[#262626] rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold text-[11px] text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {msg.actionResult.swapped
                                ? 'مبادلة مترابطة ناجحة'
                                : 'تحديث مترابط بدون أي خلل'}
                            </span>
                          </span>
                          <span className="text-[10px] text-[#777] font-mono">
                            انعدام التعارض 100%
                          </span>
                        </div>

                        {msg.actionResult.detailsList && msg.actionResult.detailsList.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-[#1c1c1c]">
                            {msg.actionResult.detailsList.map((detail, dIdx) => (
                              <div
                                key={dIdx}
                                className="text-[10px] text-[#aaa] flex items-center gap-1.5"
                              >
                                <span className="w-1 h-1 rounded-full bg-[#d4af37]" />
                                <span>{detail}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isProcessing && (
              <div className="flex items-start gap-2 animate-in fade-in">
                <div className="p-3 bg-[#141414] border border-[#222] rounded-2xl rounded-tr-none text-xs text-[#888] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#d4af37] animate-ping" />
                  <span>جارٍ معالجة الأمر وتحديث ترابط جميع الجداول...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Text Input Area */}
          <div className="p-3 bg-[#0f0f0f] border-t border-[#222]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="اكتب أمرك للمدير هنا (مثال: انقل حصة الرياضيات لـ 4AM1 إلى الاثنين الحصة 2)..."
                disabled={isProcessing}
                className="flex-1 p-3 bg-[#161616] border border-[#2e2e2e] focus:border-[#d4af37] rounded-xl text-white text-xs outline-hidden placeholder-[#666] transition-colors"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isProcessing}
                className={`p-3 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  inputMessage.trim() && !isProcessing
                    ? 'bg-[#d4af37] hover:bg-[#c59e2e] text-black shadow-lg hover:scale-105 active:scale-95'
                    : 'bg-[#222] text-[#555] cursor-not-allowed'
                }`}
                title="إرسال الأمر الكتابي"
              >
                <Send className="w-4 h-4 rotate-180" />
              </button>
            </form>
            <div className="text-[10px] text-[#666] text-center pt-1.5 flex items-center justify-center gap-2">
              <span>💬 تحكم كتابي فوري</span>
              <span>•</span>
              <span>🔄 ترابط متزامن للجداول</span>
              <span>•</span>
              <span>🛡️ فحص التعارض التلقائي</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
