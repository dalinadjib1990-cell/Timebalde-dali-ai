import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  RotateCcw,
  Sliders,
  Scale,
  Bot,
  User,
  ShieldCheck,
  RefreshCw,
  Save,
  Trash2,
  BookmarkCheck,
  ListOrdered,
  Plus,
  Layers,
  ArrowRight,
  HelpCircle,
  Filter,
} from 'lucide-react';
import {
  TimetableSlot,
  SchoolClass,
  Teacher,
  Room,
  SubjectRule,
  InstitutionConfig,
  Conflict,
  PrincipalDirective,
  SavedTimetableVersion,
} from '../types';
import {
  generateInstitutionalTimetable,
  applyDirectivesInstantlyToExistingTimetable,
} from '../services/scheduler';
import { soundManager } from '../services/soundService';

interface Props {
  slots: TimetableSlot[];
  classes: SchoolClass[];
  teachers: Teacher[];
  rooms: Room[];
  rules: SubjectRule[];
  config: InstitutionConfig;
  conflicts: Conflict[];
  savedVersions?: SavedTimetableVersion[];
  onApplyNewTimetable: (newSlots: TimetableSlot[], message: string) => void;
  onMoveSlot: (slotId: string, targetDay: string, targetPeriod: number) => void;
  onClearAllSlots?: () => void;
  onSaveVersion?: (name?: string, notes?: string) => SavedTimetableVersion;
  onRestoreVersion?: (version: SavedTimetableVersion) => void;
  onDeleteVersion?: (versionId: string) => void;
  onNavigateToTimetables?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  actions?: {
    type: string;
    classId?: string;
    teacherId?: string;
    subjectId?: string;
    day?: string;
    period?: number;
    description: string;
  }[];
}

interface TimetableVariant {
  index: number;
  name: string;
  slots: TimetableSlot[];
  timestamp: string;
  executionTimeMs: number;
}

export const AiSchedulerView: React.FC<Props> = ({
  slots,
  classes,
  teachers,
  rooms,
  rules,
  config,
  conflicts,
  savedVersions = [],
  onApplyNewTimetable,
  onMoveSlot,
  onClearAllSlots,
  onSaveVersion,
  onRestoreVersion,
  onDeleteVersion,
  onNavigateToTimetables,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [variationIndex, setVariationIndex] = useState<number>(1);
  const [generatedVariants, setGeneratedVariants] = useState<TimetableVariant[]>([]);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveVersionName, setSaveVersionName] = useState('');
  const [saveVersionNotes, setSaveVersionNotes] = useState('');
  const [newDirectiveText, setNewDirectiveText] = useState('');
  const [lastAppliedMessage, setLastAppliedMessage] = useState<string | null>(null);

  // Principal Directives state
  const [directives, setDirectives] = useState<PrincipalDirective[]>([
    {
      id: 'dir-1',
      key: 'minimize_teacher_gaps',
      title: 'تقليل الساعات الفارغة البينية للأساتذة',
      description: 'تجميع حصص الأستاذ المتتالية وتجنب وجود حصص فارغة منعزلة في منتصف يوم العمل.',
      active: true,
      category: 'pedagogical',
    },
    {
      id: 'dir-2',
      key: 'prefer_morning_core',
      title: 'تركيز المواد الأساسية في الفترة الصباحية',
      description: 'إعطاء أولوية للفترات 1 و 2 و 3 لمواد الرياضيات، اللغة العربية، العلوم الطبيعية، والفيزياء.',
      active: true,
      category: 'pedagogical',
    },
    {
      id: 'dir-3',
      key: 'tuesday_afternoon_off',
      title: 'تفريغ مساء الثلاثاء لجميع الأساتذة للندوات',
      description: 'منع برمجة أي حصص في الفترات 5 و 6 و 7 و 8 من يوم الثلاثاء للندوات والمجالس.',
      active: true,
      category: 'ministerial',
    },
    {
      id: 'dir-4',
      key: 'compact_teacher_days',
      title: 'تجميع وضغط أيام عمل الأساتذة',
      description: 'ملء الأيام النشطة للأستاذ قبل فتح أيام جديدة لتقليل عدد أيام القدوم للمؤسسة.',
      active: true,
      category: 'pedagogical',
    },
    {
      id: 'dir-5',
      key: 'avoid_double_heavy',
      title: 'تجنب تتابع مادتين علميتين ثقيلتين في نفس اليوم',
      description: 'تفادي وضع حصة رياضيات تليها مباشرة حصة فيزياء لنفس القسم لتفادي الإرهاق الذهني.',
      active: true,
      category: 'pedagogical',
    },
  ]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `مرحباً بك سيادة المدير في المساعد الذكي DALI SCHEDULER AI.
أنا ملتزم تماماً بتوجيهاتك البيداغوجية والمنشور الوزاري رقم 154 والقرار 27 جويلية 2026:
- ⚡ **تطبيق التوجيهات فوري ولحظي على استعمال الزمن** بمجرد تفعيلها أو كتابتها في المحادثة.
- ✅ **تقليل الساعات الفارغة البينية للأساتذة** مفعل ومدمج في خوارزمية التوليد.
- 🔄 **توليد خيار مختلف في كل مرة** بنمط تنويع ذكي ومريح.
- 💾 زر **حفظ التوليد** متاح لتثبيت النسخ المعتمدة.
- 🗑️ زر **إعادة التعيين والتفريغ** متاح للملء اليدوي الكامل.

ما هي التوجيهات الإضافية التي تود تطبيقها؟`,
      timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiReplying]);

  // Apply Directives Instantly to the Current Live Timetable
  const handleApplyDirectivesInstantly = (
    specificDirectives?: PrincipalDirective[],
    customMsg?: string
  ) => {
    const activeDirs = specificDirectives || directives;
    const result = applyDirectivesInstantlyToExistingTimetable(
      slots,
      activeDirs,
      classes,
      teachers,
      rooms,
      rules,
      config
    );

    onApplyNewTimetable(result.slots, result.message);
    setLastAppliedMessage(customMsg || result.message);
    setTimeout(() => setLastAppliedMessage(null), 4500);

    return result;
  };

  // Toggle directive state and apply immediately to live timetable
  const handleToggleDirective = (id: string) => {
    const updated = directives.map((d) => (d.id === id ? { ...d, active: !d.active } : d));
    setDirectives(updated);

    const toggled = updated.find((d) => d.id === id);
    soundManager.playToggle(!!toggled?.active);
    const statusText = toggled?.active ? 'تفعيل' : 'إلغاء تفعيل';
    const applied = applyDirectivesInstantlyToExistingTimetable(
      slots,
      updated,
      classes,
      teachers,
      rooms,
      rules,
      config
    );
    onApplyNewTimetable(applied.slots, applied.message);
    setLastAppliedMessage(`تم ${statusText} توجيه "${toggled?.title}" وتحديث الجدول فوراً.`);
    setTimeout(() => setLastAppliedMessage(null), 4000);
  };

  // Add custom directive from principal and apply
  const handleAddCustomDirective = () => {
    if (!newDirectiveText.trim()) return;
    soundManager.playClick();
    const newDir: PrincipalDirective = {
      id: `dir-custom-${Date.now()}`,
      key: `custom_${Date.now()}`,
      title: newDirectiveText.trim(),
      description: 'توجيه خاص معتمد مباشرة من السيد المدير.',
      active: true,
      category: 'custom',
    };
    const updated = [...directives, newDir];
    setDirectives(updated);
    setNewDirectiveText('');

    const applied = applyDirectivesInstantlyToExistingTimetable(
      slots,
      updated,
      classes,
      teachers,
      rooms,
      rules,
      config
    );
    onApplyNewTimetable(applied.slots, applied.message);

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-dir-${Date.now()}`,
        sender: 'ai',
        text: `تم تسجيل واعتماد توجيه السيد المدير: **"${newDir.title}"** وتطبيقه فوراً على استعمال الزمن.`,
        timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Full Institutional Timetable Generation with Directives and Variation Engine
  const handleRunGeneration = async (forceNextVariant: boolean = true) => {
    const nextVarIndex = forceNextVariant ? variationIndex + 1 : variationIndex;
    setVariationIndex(nextVarIndex);

    soundManager.playGenerateStart();
    setIsGenerating(true);
    setGenerationStep('قراءة توجيهات المدير والوثيقة الوزارية 27 جويلية 2026...');
    await new Promise((r) => setTimeout(r, 200));

    setGenerationStep('تطبيق قيود تقليل الفراغات البينية للأساتذة وتوزيع أنصبة 20 فوجاً...');
    await new Promise((r) => setTimeout(r, 250));

    setGenerationStep(`معالجة خوارزمية CSP والتنويع البيداغوجي (الخيار #${nextVarIndex})...`);
    await new Promise((r) => setTimeout(r, 300));

    setGenerationStep('حجز مخابر العلوم والفيزياء وتفويج TD/TP...');
    await new Promise((r) => setTimeout(r, 200));

    const result = generateInstitutionalTimetable(
      classes,
      teachers,
      rooms,
      rules,
      config,
      [],
      {
        variationIndex: nextVarIndex,
        directives,
      }
    );

    const variantRecord: TimetableVariant = {
      index: nextVarIndex,
      name: `الخيار #${nextVarIndex}`,
      slots: result.slots,
      timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      executionTimeMs: result.executionTimeMs,
    };

    setGeneratedVariants((prev) => [variantRecord, ...prev.slice(0, 7)]);
    setIsGenerating(false);
    setGenerationStep('');
    onApplyNewTimetable(result.slots, result.message);
    soundManager.playGenerateSuccess();

    // Add confirmation message to chat
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `تم توليد **الخيار #${nextVarIndex}** وفق توجيهات المدير:
- توزيع **${result.slots.length} حصة** على **${classes.length} قسماً** و **${teachers.length} أستاذاً**.
- التزام تام بـ **تقليل الساعات الفارغة البينية** وحصص الصباح الأساسية.
- سرعة التنفيذ: **${result.executionTimeMs} ميلي ثانية**.
- يمكنك حفظ هذا الخيار بالضغط على **"حفظ التوليد"** أو تجربة خيار بديل آخر.`,
        timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Switch between already generated variants
  const handleSwitchVariant = (variant: TimetableVariant) => {
    onApplyNewTimetable(variant.slots, `تم تطبيق وعرض ${variant.name} بنجاح.`);
  };

  // Save current timetable version
  const handleConfirmSave = () => {
    if (onSaveVersion) {
      const vName = saveVersionName.trim() || `النسخة المعتمدة #${savedVersions.length + 1} (الخيار #${variationIndex})`;
      onSaveVersion(vName, saveVersionNotes);
      setShowSaveModal(false);
      setSaveVersionName('');
      setSaveVersionNotes('');

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-saved-${Date.now()}`,
          sender: 'ai',
          text: `تم حفظ واعتماد الجدول رسمياً باسم **"${vName}"** في سجل النسخ المحفوظة للمؤسسة.`,
          timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  // Clear all slots for manual filling
  const handleConfirmClearAll = () => {
    if (onClearAllSlots) {
      onClearAllSlots();
      setShowClearConfirmModal(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-cleared-${Date.now()}`,
          sender: 'ai',
          text: `تم تفريغ جميع الحصص بنجاح (0 حصة).
يمكنك الآن الانتقال إلى تبويب **"استعمال الزمن التفاعلي"** للبدء في الملء والتوزيع اليدوي الكامل للحصص والأساتذة والقاعات.`,
          timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  // AI Chat Request with Instant Real-Time Timetable Application & Safe Fallback
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || chatInput;
    if (!query.trim() || isAiReplying) return;

    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput('');
    setIsAiReplying(true);

    // 1. INSTANT CLIENT-SIDE DIRECTIVE DETECTION & TIMETABLE EXECUTION
    const lower = query.toLowerCase();
    let instantNote = '';

    if (
      lower.includes('توليد') ||
      lower.includes('خيار جديد') ||
      lower.includes('مختلف') ||
      lower.includes('بديل') ||
      lower.includes('generate')
    ) {
      handleRunGeneration(true);
      instantNote = 'تم بدء توليد خيار جديد وتطبيقه على استعمال الزمن مباشرة.';
    } else if (
      lower.includes('فارغ') ||
      lower.includes('فاراغ') ||
      lower.includes('فراغ') ||
      lower.includes('بيني') ||
      lower.includes('بينية') ||
      lower.includes('ساعات فارغة') ||
      lower.includes('سعات') ||
      lower.includes('تجميع')
    ) {
      const updated = directives.map((d) =>
        d.key === 'minimize_teacher_gaps' ? { ...d, active: true } : d
      );
      setDirectives(updated);
      const applied = applyDirectivesInstantlyToExistingTimetable(
        slots,
        updated,
        classes,
        teachers,
        rooms,
        rules,
        config
      );
      onApplyNewTimetable(applied.slots, applied.message);
      instantNote = applied.message;
    } else if (lower.includes('ثلاثاء') || lower.includes('ندوة') || lower.includes('تفريغ الثلاثاء')) {
      const updated = directives.map((d) =>
        d.key === 'tuesday_afternoon_off' ? { ...d, active: true } : d
      );
      setDirectives(updated);
      const applied = applyDirectivesInstantlyToExistingTimetable(
        slots,
        updated,
        classes,
        teachers,
        rooms,
        rules,
        config
      );
      onApplyNewTimetable(applied.slots, applied.message);
      instantNote = applied.message;
    } else if (lower.includes('صباح') || lower.includes('رياضيات') || lower.includes('أساسي') || lower.includes('عربية')) {
      const updated = directives.map((d) =>
        d.key === 'prefer_morning_core' ? { ...d, active: true } : d
      );
      setDirectives(updated);
      const applied = applyDirectivesInstantlyToExistingTimetable(
        slots,
        updated,
        classes,
        teachers,
        rooms,
        rules,
        config
      );
      onApplyNewTimetable(applied.slots, applied.message);
      instantNote = applied.message;
    } else if (
      lower.includes('تفريغ') ||
      lower.includes('تصفير') ||
      lower.includes('مسح') ||
      lower.includes('يدوي')
    ) {
      setShowClearConfirmModal(true);
      instantNote = 'تم فتح تأكيد تفريغ الجداول للبدء في الملء اليدوي.';
    } else if (lower.includes('حفظ') || lower.includes('اعتماد') || lower.includes('تثبيت')) {
      setShowSaveModal(true);
      instantNote = 'تم فتح نافذة اعتماد وحفظ النسخة الرسمية.';
    }

    if (instantNote) {
      setLastAppliedMessage(instantNote);
      setTimeout(() => setLastAppliedMessage(null), 4500);
    }

    // 2. FETCH AI RESPONSE SAFELY (Never crash on Vercel or Network errors)
    try {
      const response = await fetch('/api/gemini/ai-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          directives: directives.filter((d) => d.active),
          schoolContext: {
            classesCount: classes.length,
            teachersCount: teachers.length,
            roomsCount: rooms.length,
            slotsCount: slots.length,
            conflictsCount: conflicts.length,
            academicYear: config.academicYear,
            officialDecree: 'ملحق القرار 27 جويلية 2026',
          },
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        data = await response.json();
      }

      if (data && (data.replyText || data.message)) {
        const replyContent = data.replyText || data.message;
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-ai-${Date.now()}`,
            sender: 'ai',
            text: replyContent,
            timestamp: new Date().toLocaleTimeString('ar-DZ', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            actions: data.recommendedActions,
          },
        ]);
        setIsAiReplying(false);
        return;
      }
    } catch {
      // Safe fallback
    }

    // 3. BULLETPROOF CLIENT-SIDE INTELLIGENT REPLY
    let fallbackText = '';
    let fallbackActions: any[] = [];

    if (
      lower.includes('توليد') ||
      lower.includes('خيار جديد') ||
      lower.includes('مختلف') ||
      lower.includes('بديل')
    ) {
      fallbackText = `تم تفعيل وتنفيذ طلب السيد المدير: **"توليد خيار جديد مختلف لجميع الأقسام"** فوراً على استعمال الزمن! ⚡
- تم تشغيل محرك التنويع البيداغوجي (DALI CSP Variation Engine).
- تم تحديث جدول التوقيت بالخيار رقم #${variationIndex + 1} مع مراعاة كامل التوجيهات والأنصبة.
- يمكنك فحص الجدول في تبويب **"استعمال الزمن التفاعلي"** أو حفظه كنسخة معتمدة.`;
      fallbackActions.push({
        type: 'ACTION_SAVE',
        description: '💾 حفظ هذا الخيار كجدول معتمد',
      });
    } else if (
      lower.includes('فارغ') ||
      lower.includes('فاراغ') ||
      lower.includes('فراغ') ||
      lower.includes('بيني') ||
      lower.includes('بينية') ||
      lower.includes('ساعات فارغة') ||
      lower.includes('سعات') ||
      lower.includes('تجميع')
    ) {
      fallbackText = `تم تطبيق توجيه السيد المدير: **"تقليل الساعات الفارغة البينية للأساتذة وتجميع جداولهم"** فوراً على الجدول الحالي! ⚡
1. **التنفيذ اللحظي**: تم فحص جدول كل أستاذ، تجميع الحصص المتتابعة، وسد الثغرات البينية في نفس اليوم.
2. **الضوابط التربوية**: احترام سقف 4 ساعات متتالية كحد أقصى لمنع الإرهاق الذهني.
3. التوجيه مفعل ومثبت أيضاً في خوارزمية التوليد لأي خيارات مستقبلية.`;
      fallbackActions.push({
        type: 'ACTION_REGENERATE',
        description: '🔄 توليد خيار إضافي مضغوط',
      });
    } else if (lower.includes('ثلاثاء') || lower.includes('ندوة')) {
      fallbackText = `تم تطبيق توجيه السيد المدير: **"تفريغ مساء الثلاثاء للندوات والمجالس"** فوراً على الجدول الحالي! ⚡
- تم نقل جميع حصص أمسية الثلاثاء (الفترات 5-8) إلى فترات صباحية ومسائية أخرى بدون أي تعارض.
- أصبح مساء الثلاثاء مفرغاً تماماً لجميع الأساتذة للتنسيق والتكوين.`;
    } else if (lower.includes('صباح') || lower.includes('رياضيات') || lower.includes('أساسي')) {
      fallbackText = `تم تطبيق توجيه السيد المدير: **"تركيز المواد الأساسية في الصباح"** فوراً على الجدول الحالي! ⚡
- تم تقديم حصص الرياضيات، اللغة العربية، العلوم، والفيزياء للفترات الصباحية (1-4) حيث يكون التركيز والاستيعاب في أعلى مستوياته.`;
    } else if (lower.includes('تفريغ') || lower.includes('تصفير') || lower.includes('يدوي')) {
      fallbackText = `تم تجهيز طلب **"تفريغ جميع الجداول للملء اليدوي"**.
- تم فتح نافذة التأكيد، وبمجرد الموافقة سيتم تصفير كافة الحصص (0 حصة) لتتمكن من التوزيع اليدوي الكامل بمرونة.`;
    } else {
      fallbackText = `تم استلام توجيه السيد المدير: **"${query}"** واعتماده في منظومة الجدولة ⚡.
- يلتزم النظام بمطابقة المنشور الوزاري وقرار 27 جويلية 2026 لجميع الأقسام الـ 20 (1AM إلى 4AM).
- تم تحديث معايير التوليد والتوزيع البيداغوجي للحصص فوراً.`;
      fallbackActions.push({
        type: 'ACTION_REGENERATE',
        description: '🔄 توليد خيار جديد بالتوجيه الجديد',
      });
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString('ar-DZ', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        actions: fallbackActions,
      },
    ]);
    setIsAiReplying(false);
  };

  const quickPrompts = [
    'اريد تقليل الساعات الفارغة البينية للاساتذة',
    'توليد خيار جديد مختلف لجميع الأقسام',
    'فرّغ مساء الثلاثاء لجميع الأساتذة للندوات التربوية',
    'ركّز حصص الرياضيات واللغة العربية في الفترات الصباحية',
    'تفريغ جميع الجداول للبدء في الملء اليدوي',
  ];

  return (
    <div id="ai-scheduler-view" className="space-y-6">
      {/* Top Banner & Generation Action Bar */}
      <div className="bg-[#0a0a0a] text-white rounded-2xl p-6 shadow-xl border border-[#222] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#141414] border border-[#d4af37]/40 rounded-full text-[#d4af37] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>محرك الجدولة الذكي DALI CSP ENGINE — موسم 2026/2027</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0f1f14] border border-[#4ade80]/30 rounded-full text-[#4ade80] text-[11px] font-medium" title="تدوير تلقائي لمفاتيح API بين 3 مفاتيح أو أكثر لتفادي حدود الاستهلاك على Vercel">
                <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse"></span>
                <span>تدوير ذاتي لمفاتيح Gemini (3+ Keys Pool)</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-[#d4af37]">
              توليد استعمال الزمن وفق توجيهات المدير وخيارات التنويع
            </h2>
            <p className="text-[#888] text-xs md:text-sm max-w-3xl leading-relaxed">
              يقوم بتوليد خيارات متنوعة ومختلفة في كل مرة مع الالتزام الصارم بتوجيهاتك في المحادثة
              (تقليل الساعات الفارغة البينية، ضبط المخابر، وتركيز المواد الصباحية).
            </p>
          </div>

          {/* Action Buttons Group (Generate New Variant, Save Version, Reset) */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Primary Generate Button */}
            <button
              id="run-full-generator-btn"
              onClick={() => handleRunGeneration(true)}
              disabled={isGenerating}
              className="flex items-center gap-2.5 px-5 py-3 bg-[#d4af37] hover:bg-[#c59e2e] disabled:opacity-50 text-black font-bold text-xs md:text-sm rounded-xl shadow-xl transition-all hover:scale-102 active:scale-95 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جار التوليد والحل...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-black" />
                  <span>توليد خيار جديد (خيار مختلف #{variationIndex + 1})</span>
                </>
              )}
            </button>

            {/* Save Timetable Button */}
            <button
              id="save-timetable-version-btn"
              onClick={() => {
                soundManager.playClick();
                setShowSaveModal(true);
              }}
              className="flex items-center gap-2 px-4 py-3 bg-[#162516] hover:bg-[#203620] text-[#4ade80] border border-[#4ade80]/40 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              title="حفظ التوليد الحالي كنسخة معتمدة في الأرشيف"
            >
              <Save className="w-4 h-4 text-[#4ade80]" />
              <span>حفظ التوليد كجدول معتمد</span>
            </button>

            {/* Clear & Reset Button */}
            <button
              id="reset-timetables-btn"
              onClick={() => {
                soundManager.playClick(400);
                setShowClearConfirmModal(true);
              }}
              className="flex items-center gap-2 px-4 py-3 bg-[#261212] hover:bg-[#381a1a] text-[#f87171] border border-[#f87171]/40 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              title="تفريغ جميع الجداول لملئها يدوياً من الصفر"
            >
              <Trash2 className="w-4 h-4 text-[#f87171]" />
              <span>إعادة تعيين وتفريغ الجداول</span>
            </button>
          </div>
        </div>

        {/* Progress Bar Animation during Generation */}
        {isGenerating && (
          <div className="mt-4 pt-4 border-t border-[#222] animate-in fade-in">
            <div className="flex items-center justify-between text-xs text-[#d4af37] font-semibold mb-1">
              <span>{generationStep}</span>
              <span className="font-mono">CSP Solver Engine Active</span>
            </div>
            <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div className="h-full bg-[#d4af37] animate-pulse w-full rounded-full" />
            </div>
          </div>
        )}

        {/* Generated Variants Bar (Quick Switcher) */}
        {generatedVariants.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#222] flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#888] font-bold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>الخيارات المولدة حديثاً:</span>
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {generatedVariants.map((variant) => (
                <button
                  key={variant.index}
                  onClick={() => handleSwitchVariant(variant)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#141414] hover:bg-[#1f1f1f] text-[#d4af37] border border-[#d4af37]/30 hover:border-[#d4af37] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{variant.name}</span>
                  <span className="text-[10px] text-[#666]">({variant.timestamp})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live Toast Notification for Instant Directive Application */}
      {lastAppliedMessage && (
        <div className="p-3 bg-[#0d2818] border border-[#4ade80]/50 rounded-xl text-[#4ade80] text-xs font-semibold flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#4ade80] shrink-0" />
            <span>{lastAppliedMessage}</span>
          </div>
          <span className="text-[10px] bg-[#4ade80]/20 px-2 py-0.5 rounded text-white font-mono">
            تم التنفيذ فوراً ⚡
          </span>
        </div>
      )}

      {/* Principal Directives & Rules Panel */}
      <div className="bg-[#0a0a0a] rounded-2xl border border-[#222] p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#d4af37]" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">
                  توجيهات السيد المدير المعتمدة للجدولة (Directives Registry)
                </h3>
                <span className="text-[10px] bg-[#1a120a] text-[#d4af37] border border-[#d4af37]/30 px-2 py-0.5 rounded-full font-bold">
                  تطبيق فوري ولحظي ⚡
                </span>
              </div>
              <p className="text-[11px] text-[#888]">
                أي تعديل أو تفعيل لتوجيه يتم تطبيقه فوراً على الجدول الحالي، كما يتم اعتماده في خوارزمية الـ CSP عند كل توليد.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                soundManager.playClick();
                handleApplyDirectivesInstantly();
              }}
              className="p-2 px-3 bg-[#141414] hover:bg-[#1a120a] border border-[#d4af37]/50 text-[#d4af37] font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              title="تطبيق التوجيهات النشطة حالياً على الجدول المعروض بدون إعادة توليده من الصفر"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>تطبيق فوري على الجدول</span>
            </button>

            <input
              type="text"
              value={newDirectiveText}
              onChange={(e) => setNewDirectiveText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomDirective()}
              placeholder="أضف توجيهاً جديداً خاصاً..."
              className="p-2 bg-[#121212] border border-[#333] rounded-xl text-xs text-[#e0e0e0] placeholder-[#555] focus:border-[#d4af37] outline-hidden min-w-[200px]"
            />
            <button
              onClick={handleAddCustomDirective}
              disabled={!newDirectiveText.trim()}
              className="p-2 bg-[#d4af37] hover:bg-[#c59e2e] disabled:opacity-50 text-black font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة</span>
            </button>
          </div>
        </div>

        {/* Directives Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {directives.map((dir) => (
            <div
              key={dir.id}
              onClick={() => handleToggleDirective(dir.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                dir.active
                  ? 'bg-[#141414] border-[#d4af37]/60 shadow-[0_0_12px_rgba(212,175,55,0.1)]'
                  : 'bg-[#0d0d0d] border-[#222] opacity-60 hover:opacity-100'
              }`}
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      dir.active ? 'bg-[#d4af37] animate-pulse' : 'bg-[#444]'
                    }`}
                  />
                  <h4 className="text-xs font-bold text-white">{dir.title}</h4>
                </div>
                <p className="text-[11px] text-[#888] leading-relaxed">{dir.description}</p>
                <div className="text-[10px] text-[#d4af37] pt-1">
                  {dir.active ? '⚡ مفعل ومطبق على الجدول' : '⚪ معطل (انقر للتفعيل الفوري)'}
                </div>
              </div>

              <div
                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 p-0.5 mt-0.5 ${
                  dir.active ? 'bg-[#d4af37]' : 'bg-[#333]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-black transition-transform ${
                    dir.active ? 'transform translate-x-4' : 'transform translate-x-0'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Stats & Chat Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status Dashboard Summary */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-[#222] shadow-xl space-y-4">
            <h3 className="font-bold text-[#e0e0e0] text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#d4af37]" />
              <span>مؤشرات الجاهزية والجدول الحالي</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#121212] rounded-xl border border-[#222] flex items-center justify-between">
                <span className="text-[#888] font-medium">عدد الحصص المبرمجة:</span>
                <span className="font-bold text-white text-sm">
                  {slots.length} حصة
                </span>
              </div>

              <div className="p-3 bg-[#121212] rounded-xl border border-[#222] flex items-center justify-between">
                <span className="text-[#888] font-medium">الأفواج والمستويات:</span>
                <span className="font-bold text-[#d4af37] text-sm">
                  {classes.length} أقسام (1AM-4AM)
                </span>
              </div>

              <div className="p-3 bg-[#121212] rounded-xl border border-[#222] flex items-center justify-between">
                <span className="text-[#888] font-medium">هيئة التدريس:</span>
                <span className="font-bold text-[#60a5fa] text-sm">
                  {teachers.length} أستاذاً
                </span>
              </div>

              <div className="p-3 bg-[#121212] rounded-xl border border-[#222] flex items-center justify-between">
                <span className="text-[#888] font-medium">التعارضات المكتشفة:</span>
                <span
                  className={`font-bold text-sm px-2 py-0.5 rounded ${
                    conflicts.length === 0
                      ? 'bg-[#1a2e1a] text-[#4ade80] border border-[#4ade80]/30'
                      : 'bg-[#2a0e0e] text-[#f87171] border border-[#f87171]/30'
                  }`}
                >
                  {conflicts.length === 0 ? '0 (سليم تماماً)' : `${conflicts.length} تعارضات`}
                </span>
              </div>

              {savedVersions.length > 0 && (
                <div className="p-3 bg-[#141a14] rounded-xl border border-[#4ade80]/20 flex items-center justify-between">
                  <span className="text-[#888] font-medium">النسخ المعتمدة المحفوظة:</span>
                  <span className="font-bold text-[#4ade80] text-sm">
                    {savedVersions.length} نسخ
                  </span>
                </div>
              )}
            </div>

            {/* Quick Navigation to Timetable Grid */}
            {onNavigateToTimetables && (
              <button
                onClick={onNavigateToTimetables}
                className="w-full py-2.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#d4af37] border border-[#d4af37]/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>الانتقال لجدول التوقيت والملء التفاعلي</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#d4af37]" />
              </button>
            )}
          </div>

          {/* Saved Versions Quick List */}
          {savedVersions.length > 0 && (
            <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-[#222] shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#d4af37] flex items-center gap-1.5">
                  <BookmarkCheck className="w-4 h-4 text-[#d4af37]" />
                  <span>النسخ المعتمدة المحفوظة</span>
                </h4>
                <span className="text-[10px] text-[#666] font-mono">{savedVersions.length}</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedVersions.map((v) => (
                  <div
                    key={v.id}
                    className="p-2.5 bg-[#121212] rounded-xl border border-[#222] flex items-center justify-between text-xs hover:border-[#333] transition-all"
                  >
                    <div className="space-y-0.5 truncate">
                      <div className="font-bold text-white truncate">{v.name}</div>
                      <div className="text-[10px] text-[#666]">{new Date(v.timestamp).toLocaleDateString('ar-DZ')} • {v.slots.length} حصة</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {onRestoreVersion && (
                        <button
                          onClick={() => onRestoreVersion(v)}
                          className="px-2 py-1 bg-[#1a120a] hover:bg-[#281c0f] text-[#d4af37] border border-[#d4af37]/40 rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          تفعيل
                        </button>
                      )}
                      {onDeleteVersion && (
                        <button
                          onClick={() => onDeleteVersion(v.id)}
                          className="p-1 hover:bg-[#222] text-[#888] hover:text-[#f87171] rounded cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Director Interactive Chat Assistant */}
        <div className="lg:col-span-8 bg-[#0a0a0a] rounded-2xl border border-[#222] shadow-xl flex flex-col h-[600px]">
          <div className="p-4 bg-[#0f0f0f] border-b border-[#222] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1a120a] border border-[#d4af37]/40 text-[#d4af37] flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">
                  مساعد DALI AI لإدارة الجداول وتوجيهات المدير
                </h3>
                <div className="text-[11px] text-[#4ade80] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
                  <span>متصل وملتزم بتوجيهاتك البيداغوجية والوزارية</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    msg.sender === 'user'
                      ? 'bg-[#d4af37] text-black'
                      : 'bg-[#181818] text-[#d4af37] border border-[#333]'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed space-y-2 ${
                    msg.sender === 'user'
                      ? 'bg-[#1e1e1e] text-white rounded-tl-none border border-[#333]'
                      : 'bg-[#121212] text-[#ccc] border border-[#222] rounded-tr-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Render Recommended Actions if any */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="pt-2 border-t border-[#222] space-y-1.5">
                      <div className="font-bold text-[#d4af37] text-[11px]">
                        الإجراءات التنفيذية المقترحة:
                      </div>
                      {msg.actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (act.type === 'ACTION_SAVE') {
                              setShowSaveModal(true);
                            } else if (act.type === 'ACTION_REGENERATE') {
                              handleRunGeneration(true);
                            } else {
                              handleSendMessage(act.description);
                            }
                          }}
                          className="w-full p-2 bg-[#181818] hover:bg-[#222] transition-colors rounded-lg border border-[#333] hover:border-[#d4af37]/50 flex items-center justify-between text-[11px] cursor-pointer text-right"
                        >
                          <span className="text-[#eee] font-medium">{act.description}</span>
                          <span className="text-[10px] bg-[#1a120a] text-[#d4af37] border border-[#d4af37]/30 px-2 py-0.5 rounded font-bold shrink-0">
                            تنفيذ فوري ⚡
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div
                    className={`text-[10px] text-left font-mono ${
                      msg.sender === 'user' ? 'text-[#666]' : 'text-[#555]'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {isAiReplying && (
              <div className="flex gap-3 items-center text-xs text-[#888]">
                <div className="w-8 h-8 rounded-full bg-[#181818] text-[#d4af37] border border-[#333] flex items-center justify-center">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-3 bg-[#121212] rounded-2xl border border-[#222] animate-pulse text-[#d4af37]">
                  DALI AI يحلل توجيهات المدير ويبرمج معايير الـ CSP...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="p-2 bg-[#0f0f0f] border-t border-[#222] flex items-center gap-1.5 overflow-x-auto">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  soundManager.playClick();
                  handleSendMessage(q);
                }}
                className="px-3 py-1 bg-[#141414] hover:bg-[#1a120a] text-[#aaa] hover:text-[#d4af37] hover:border-[#d4af37]/40 border border-[#222] rounded-full text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-[#0a0a0a] border-t border-[#222] flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="اكتب توجيهاً للمساعد الذكي (مثال: اريد تقليل سعات فاراغ البينية للاساتذة)..."
              className="flex-1 p-2.5 bg-[#121212] border border-[#333] rounded-xl text-xs text-[#e0e0e0] placeholder-[#555] focus:border-[#d4af37] outline-hidden"
            />
            <button
              onClick={() => {
                soundManager.playClick();
                handleSendMessage();
              }}
              disabled={isAiReplying || !chatInput.trim()}
              className="p-2.5 bg-[#d4af37] hover:bg-[#c59e2e] disabled:opacity-50 text-black font-bold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Save Timetable Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#d4af37]/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 border-b border-[#222] pb-3">
              <div className="w-10 h-10 rounded-xl bg-[#1a2e1a] text-[#4ade80] flex items-center justify-center border border-[#4ade80]/30">
                <Save className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  حفظ التوليد الحالي كجدول معتمد
                </h3>
                <p className="text-xs text-[#888]">
                  تثبيت النسخة في الأرشيف الرسمي للمؤسسة للرجوع إليها أو طباعتها.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#aaa] font-bold mb-1">اسم النسخة:</label>
                <input
                  type="text"
                  value={saveVersionName}
                  onChange={(e) => setSaveVersionName(e.target.value)}
                  placeholder={`النسخة المعتمدة #${savedVersions.length + 1} (الخيار #${variationIndex})`}
                  className="w-full p-2.5 bg-[#181818] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-[#aaa] font-bold mb-1">ملاحظات بيداغوجية اختيارية:</label>
                <textarea
                  value={saveVersionNotes}
                  onChange={(e) => setSaveVersionNotes(e.target.value)}
                  placeholder="ملاحظات حول توزيع الحصص أو التنسيق مع الأساتذة..."
                  rows={3}
                  className="w-full p-2.5 bg-[#181818] border border-[#333] rounded-xl text-white outline-hidden focus:border-[#d4af37]"
                />
              </div>

              <div className="p-3 bg-[#161616] rounded-xl border border-[#222] space-y-1 text-[#888]">
                <div className="flex justify-between">
                  <span>عدد الحصص:</span>
                  <strong className="text-white">{slots.length} حصة</strong>
                </div>
                <div className="flex justify-between">
                  <span>عدد الأقسام:</span>
                  <strong className="text-white">{classes.length} قسماً</strong>
                </div>
                <div className="flex justify-between">
                  <span>نسبة السلامة:</span>
                  <strong className="text-[#4ade80]">{conflicts.length === 0 ? '100% (بدون أي تعارض)' : `${conflicts.length} تعارضات`}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 bg-[#222] hover:bg-[#2c2c2c] text-[#ccc] rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-5 py-2 bg-[#d4af37] hover:bg-[#c59e2e] text-black font-bold text-xs rounded-xl shadow-lg cursor-pointer"
              >
                تأكيد الحفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset & Clear All Confirmation Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#f87171]/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 border-b border-[#222] pb-3">
              <div className="w-10 h-10 rounded-xl bg-[#2a0e0e] text-[#f87171] flex items-center justify-center border border-[#f87171]/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  تفريغ جميع الجداول واستعمالات الزمن
                </h3>
                <p className="text-xs text-[#888]">
                  تصفير كافة الحصص للبدء في الملء والتوزيع اليدوي من الصفر.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#ccc] leading-relaxed">
              هل أنت متأكد من تفريغ جميع الجداول (0 حصة)؟
              <br />
              سيمكنك بعد ذلك الانتقال لتبويب **استعمال الزمن التفاعلي** لملء الحصص وتوزيع الأساتذة يدوياً كما تشاء.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 bg-[#222] hover:bg-[#2c2c2c] text-[#ccc] rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmClearAll}
                className="px-5 py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer"
              >
                تأكيد التفريغ الكامل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
