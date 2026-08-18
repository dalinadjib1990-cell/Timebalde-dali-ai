import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Navbar,
  ActiveTab,
} from './components/Navbar';
import { OfficialRulesView } from './components/OfficialRulesView';
import { TimetablesView } from './components/TimetablesView';
import { AiSchedulerView } from './components/AiSchedulerView';
import { TeachersManagementView } from './components/TeachersManagementView';
import { ClassesManagementView } from './components/ClassesManagementView';
import { RoomsManagementView } from './components/RoomsManagementView';
import { LegalRulesView } from './components/LegalRulesView';
import { ConflictsView } from './components/ConflictsView';
import { LegalValidationView } from './components/LegalValidationView';
import { DocumentUpdaterModal } from './components/DocumentUpdaterModal';
import { IslamicTopBar } from './components/IslamicTopBar';
import { soundManager } from './services/soundService';

import {
  SubjectRule,
  LegalRule,
  SchoolClass,
  Teacher,
  Room,
  InstitutionConfig,
  TimetableSlot,
  Conflict,
  SavedTimetableVersion,
} from './types';

import { OFFICIAL_SUBJECT_RULES, OFFICIAL_LEGAL_RULES } from './data/officialData';
import {
  DEFAULT_INSTITUTION_CONFIG,
  DEFAULT_CLASSES,
  DEFAULT_ROOMS,
  DEFAULT_TEACHERS,
} from './data/defaultSchool';

import { generateInstitutionalTimetable, autoRepairTimetable } from './services/scheduler';
import { detectTimetableConflicts } from './services/conflictDetector';
import { generateLegalValidationReport } from './services/legalValidator';

export default function App() {
  // Main State
  const [activeTab, setActiveTab] = useState<ActiveTab>('official_rules');
  const [rules, setRules] = useState<SubjectRule[]>(() => {
    const saved = localStorage.getItem('dali_subject_rules_2026');
    return saved ? JSON.parse(saved) : OFFICIAL_SUBJECT_RULES;
  });

  const [legalRules, setLegalRules] = useState<LegalRule[]>(() => {
    const saved = localStorage.getItem('dali_legal_rules_2026');
    return saved ? JSON.parse(saved) : OFFICIAL_LEGAL_RULES;
  });

  const [config, setConfig] = useState<InstitutionConfig>(() => {
    const saved = localStorage.getItem('dali_institution_config_2026');
    return saved ? JSON.parse(saved) : DEFAULT_INSTITUTION_CONFIG;
  });

  const [classes, setClasses] = useState<SchoolClass[]>(() => {
    const saved = localStorage.getItem('dali_classes_2026');
    return saved ? JSON.parse(saved) : DEFAULT_CLASSES;
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('dali_teachers_2026');
    return saved ? JSON.parse(saved) : DEFAULT_TEACHERS;
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem('dali_rooms_2026');
    return saved ? JSON.parse(saved) : DEFAULT_ROOMS;
  });

  const [slots, setSlots] = useState<TimetableSlot[]>(() => {
    const saved = localStorage.getItem('dali_timetable_slots_2026');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback to initial generation
      }
    }
    // Generate initial timetable on startup
    const initialRes = generateInstitutionalTimetable(
      DEFAULT_CLASSES,
      DEFAULT_TEACHERS,
      DEFAULT_ROOMS,
      OFFICIAL_SUBJECT_RULES,
      DEFAULT_INSTITUTION_CONFIG
    );
    return initialRes.slots;
  });

  const [savedVersions, setSavedVersions] = useState<SavedTimetableVersion[]>(() => {
    const saved = localStorage.getItem('dali_saved_timetable_versions_2026');
    return saved ? JSON.parse(saved) : [];
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('dali_theme_dark');
    return saved !== null ? saved === 'true' : true;
  });

  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => {
    return soundManager.getIsMuted();
  });

  const [showDocumentUpdater, setShowDocumentUpdater] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync theme changes with DOM and localStorage
  useEffect(() => {
    localStorage.setItem('dali_theme_dark', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleToggleSound = () => {
    const nextMuted = soundManager.toggleMute();
    setIsSoundMuted(nextMuted);
    showToast(nextMuted ? 'تم كتم المؤثرات الصوتية 🔇' : 'تم تفعيل المؤثرات الصوتية 🔊');
  };

  // Auto-save savedVersions to localStorage
  useEffect(() => {
    localStorage.setItem('dali_saved_timetable_versions_2026', JSON.stringify(savedVersions));
  }, [savedVersions]);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('dali_subject_rules_2026', JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem('dali_legal_rules_2026', JSON.stringify(legalRules));
  }, [legalRules]);

  useEffect(() => {
    localStorage.setItem('dali_classes_2026', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('dali_teachers_2026', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('dali_rooms_2026', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem('dali_timetable_slots_2026', JSON.stringify(slots));
  }, [slots]);

  // Reactive Conflict Detection
  const conflicts: Conflict[] = useMemo(() => {
    return detectTimetableConflicts(slots, teachers, classes, rooms, rules, config);
  }, [slots, teachers, classes, rooms, rules, config]);

  // Reactive Legal Validation Report
  const legalReport = useMemo(() => {
    return generateLegalValidationReport(slots, teachers, classes, rooms, rules, legalRules, config);
  }, [slots, teachers, classes, rooms, rules, legalRules, config]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Rule Handlers
  const handleUpdateRule = (updated: SubjectRule) => {
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    showToast(`تم تعديل الحجم الساعي لمادة ${updated.subject_name} (${updated.level}) بنجاح`);
  };

  const handleResetToOfficial = () => {
    if (window.confirm('هل تود استعادة جميع المواقيت والمعاملات الأصلية من الوثيقة الوزارية 27 جويلية 2026؟')) {
      setRules(OFFICIAL_SUBJECT_RULES);
      showToast('تمت استعادة القواعد والمواقيت الوزارية الأصلية');
    }
  };

  // Legal Rule Toggles
  const handleToggleLegalRule = (ruleId: string) => {
    setLegalRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r))
    );
  };

  const handleAddLegalRule = (newRule: LegalRule) => {
    setLegalRules((prev) => [newRule, ...prev]);
    showToast('تمت إضافة القاعدة التنظيمية الجديدة');
  };

  // Teacher Handlers
  const handleUpdateTeacher = (t: Teacher) => {
    setTeachers((prev) => prev.map((item) => (item.id === t.id ? t : item)));
    showToast(`تم تحديث بيانات الأستاذ ${t.name}`);
  };

  const handleAddTeacher = (t: Teacher) => {
    setTeachers((prev) => [...prev, t]);
    showToast(`تمت إضافة الأستاذ ${t.name}`);
  };

  const handleDeleteTeacher = (tId: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== tId));
    setSlots((prev) => prev.filter((s) => s.teacherId !== tId));
    showToast('تم حذف الأستاذ وإزالة حصصه من الجدول');
  };

  const handleBulkImportTeachers = (newTeachers: Teacher[]) => {
    setTeachers((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const filtered = newTeachers.filter((nt) => !existingIds.has(nt.id));
      return [...prev, ...filtered];
    });
    showToast(`تم استيراد ${newTeachers.length} أستاذاً بنجاح بالذكاء الاصطناعي`);
  };

  // Class Handlers
  const handleAddClass = (cls: SchoolClass) => {
    setClasses((prev) => [...prev, cls]);
    showToast(`تمت إضافة الفوج التربوي ${cls.name}`);
  };

  const handleUpdateClass = (cls: SchoolClass) => {
    setClasses((prev) => prev.map((item) => (item.id === cls.id ? cls : item)));
    showToast(`تم تحديث بيانات الفوج ${cls.name}`);
  };

  const handleDeleteClass = (classId: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== classId));
    setSlots((prev) => prev.filter((s) => s.classId !== classId));
    showToast('تم حذف الفوج التربوي وحصصه');
  };

  // Room Handlers
  const handleAddRoom = (r: Room) => {
    setRooms((prev) => [...prev, r]);
    showToast(`تمت إضافة الهيكل ${r.name}`);
  };

  const handleUpdateRoom = (r: Room) => {
    setRooms((prev) => prev.map((item) => (item.id === r.id ? r : item)));
    showToast(`تم تحديث ${r.name}`);
  };

  const handleDeleteRoom = (rId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== rId));
    showToast('تم حذف القاعة / المخبر');
  };

  // Move Slot (Drag and Drop / Swap)
  const handleMoveSlot = (slotId: string, targetDay: string, targetPeriod: number) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id === slotId) {
          return {
            ...s,
            day: targetDay,
            period: targetPeriod,
          };
        }
        return s;
      })
    );
    showToast(`تم نقل الحصة إلى يوم ${targetDay} (الحصة ${targetPeriod})`);
  };

  // Apply Generated Timetable
  const handleApplyNewTimetable = (newSlots: TimetableSlot[], message: string) => {
    setSlots(newSlots);
    showToast(message);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Reset & Clear All Timetables (for pure manual entry)
  const handleClearAllSlots = () => {
    setSlots([]);
    showToast('تم تفريغ جميع الجداول واستعمالات الزمن بنجاح للملء اليدوي الكامل.');
  };

  // Save Timetable Version
  const handleSaveVersion = (versionName?: string, notes?: string) => {
    const nowIso = new Date().toISOString();
    const newVersion: SavedTimetableVersion = {
      id: `ver-${Date.now()}`,
      name: versionName || `النسخة المعتمدة #${savedVersions.length + 1} (${new Date().toLocaleDateString('ar-DZ')})`,
      createdAt: nowIso,
      timestamp: nowIso,
      slotsCount: slots.length,
      slots: [...slots],
      conflictCount: conflicts.length,
      notes: notes || `جدول تم اعتماده وحفظه بعدد ${slots.length} حصة.`,
    };
    setSavedVersions((prev) => [newVersion, ...prev]);
    showToast(`تم حفظ النسخة "${newVersion.name}" كجدول معتمد بنجاح! 💾`);
    return newVersion;
  };

  // Restore Saved Version
  const handleRestoreVersion = (version: SavedTimetableVersion) => {
    setSlots(version.slots);
    showToast(`تم استرجاع وتفعيل "${version.name}" بنجاح (${version.slots.length} حصة).`);
  };

  // Delete Saved Version
  const handleDeleteVersion = (versionId: string) => {
    setSavedVersions((prev) => prev.filter((v) => v.id !== versionId));
    showToast('تم حذف النسخة المحفوظة.');
  };

  // Add Manual Slot
  const handleAddSlot = (newSlot: Omit<TimetableSlot, 'id'>) => {
    const id = `slot-man-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setSlots((prev) => [...prev, { ...newSlot, id }]);
    showToast('تمت إضافة الحصة يدوياً بنجاح.');
  };

  // Delete Slot
  const handleDeleteSlot = (slotId: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    showToast('تم حذف الحصة بنجاح.');
  };

  // Auto Rebalance for specific class or teacher
  const handleAutoRebalance = (targetClassId?: string, targetTeacherId?: string) => {
    const res = autoRepairTimetable(
      slots,
      targetClassId || null,
      targetTeacherId || null,
      classes,
      teachers,
      rooms,
      rules,
      config
    );
    setSlots(res.slots);
    showToast(res.message);
  };

  // Fix Single Conflict
  const handleAutoFixConflict = (conf: Conflict) => {
    if (conf.affectedItems.classId || conf.affectedItems.teacherId) {
      handleAutoRebalance(conf.affectedItems.classId, conf.affectedItems.teacherId);
    } else {
      const res = generateInstitutionalTimetable(classes, teachers, rooms, rules, config);
      setSlots(res.slots);
      showToast('تمت إعادة توليد وموازنة الجدول بالكامل لحل التعارض');
    }
  };

  // Fix All Conflicts
  const handleAutoFixAll = () => {
    const res = generateInstitutionalTimetable(classes, teachers, rooms, rules, config);
    setSlots(res.slots);
    showToast('تم حل جميع التعارضات وتحديث الجداول بنجاح');
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#050505] text-[#e0e0e0]' : 'bg-[#f4f6f9] text-[#1e293b]'} flex flex-col font-sans selection:bg-[#d4af37] selection:text-black app-bg-root transition-colors duration-200`}>
      {/* Dynamic Animated Islamic Top Bar with Moving Dhikr & Controls */}
      <IslamicTopBar
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        isMuted={isSoundMuted}
        onToggleSound={handleToggleSound}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#0f0f0f] text-white px-5 py-3 rounded-xl shadow-2xl border border-[#d4af37]/40 text-xs font-bold flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#d4af37] animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        conflictCount={conflicts.length}
        onOpenDocumentUpdater={() => setShowDocumentUpdater(true)}
      />

      {/* Main Workspace Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {activeTab === 'official_rules' && (
          <OfficialRulesView
            rules={rules}
            onUpdateRule={handleUpdateRule}
            onResetToOfficial={handleResetToOfficial}
          />
        )}

        {activeTab === 'timetables' && (
          <TimetablesView
            slots={slots}
            classes={classes}
            teachers={teachers}
            rooms={rooms}
            rules={rules}
            config={config}
            conflicts={conflicts}
            onMoveSlot={handleMoveSlot}
            onAutoRebalance={handleAutoRebalance}
            onAddSlot={handleAddSlot}
            onDeleteSlot={handleDeleteSlot}
            onClearAllSlots={handleClearAllSlots}
            onSaveVersion={handleSaveVersion}
          />
        )}

        {activeTab === 'ai_scheduler' && (
          <AiSchedulerView
            slots={slots}
            classes={classes}
            teachers={teachers}
            rooms={rooms}
            rules={rules}
            config={config}
            conflicts={conflicts}
            savedVersions={savedVersions}
            onApplyNewTimetable={handleApplyNewTimetable}
            onMoveSlot={handleMoveSlot}
            onClearAllSlots={handleClearAllSlots}
            onSaveVersion={handleSaveVersion}
            onRestoreVersion={handleRestoreVersion}
            onDeleteVersion={handleDeleteVersion}
            onNavigateToTimetables={() => setActiveTab('timetables')}
          />
        )}

        {activeTab === 'teachers' && (
          <TeachersManagementView
            teachers={teachers}
            classes={classes}
            rules={rules}
            onUpdateTeacher={handleUpdateTeacher}
            onAddTeacher={handleAddTeacher}
            onDeleteTeacher={handleDeleteTeacher}
            onBulkImportTeachers={handleBulkImportTeachers}
          />
        )}

        {activeTab === 'classes' && (
          <ClassesManagementView
            classes={classes}
            rooms={rooms}
            rules={rules}
            onAddClass={handleAddClass}
            onUpdateClass={handleUpdateClass}
            onDeleteClass={handleDeleteClass}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomsManagementView
            rooms={rooms}
            onAddRoom={handleAddRoom}
            onUpdateRoom={handleUpdateRoom}
            onDeleteRoom={handleDeleteRoom}
          />
        )}

        {activeTab === 'legal_rules' && (
          <LegalRulesView
            legalRules={legalRules}
            onToggleRule={handleToggleLegalRule}
            onAddRule={handleAddLegalRule}
          />
        )}

        {activeTab === 'conflicts' && (
          <ConflictsView
            conflicts={conflicts}
            onAutoFixConflict={handleAutoFixConflict}
            onAutoFixAll={handleAutoFixAll}
          />
        )}

        {activeTab === 'validation' && (
          <LegalValidationView
            report={legalReport}
            config={config}
          />
        )}
      </main>

      {/* AI Document Updater Modal */}
      {showDocumentUpdater && (
        <DocumentUpdaterModal
          currentRules={rules}
          onApplyUpdatedRules={(newRules) => {
            setRules(newRules);
            showToast('تم تحديث واعتماد القواعد الوزارية الجديدة بنجاح');
          }}
          onClose={() => setShowDocumentUpdater(false)}
        />
      )}

      {/* Footer */}
      <footer className="bg-[#0a0a0a] text-[#888] text-xs py-4 border-t border-[#222] text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>🇩🇿</span>
            <span>نظام <strong className="text-[#d4af37]">DALI TIMETABLE AI</strong> — النسخة الرسمية للمتوسطة الجزائرية (الموسم 2026/2027)</span>
          </div>
          <div className="text-[11px] text-[#555] font-mono flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
            <span>حالة المحرك: متصل وجاهز (Optimal) • مطابق لملحق القرار 27 جويلية 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
