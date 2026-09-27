export type GradeLevel = '1AM' | '2AM' | '3AM' | '4AM';

export type SubjectId =
  | 'arabic'
  | 'english'
  | 'french'
  | 'amazigh'
  | 'math'
  | 'science'
  | 'physics'
  | 'history'
  | 'geography'
  | 'islamic'
  | 'civic'
  | 'art_music'
  | 'pe'
  | 'computer';

export type RoomType =
  | 'regular'
  | 'science_lab'
  | 'physics_lab'
  | 'computer_lab'
  | 'sports_ground'
  | 'art_room';

export interface SubjectRule {
  id: string;
  subject_id: SubjectId;
  subject_name: string;
  level: GradeLevel;
  weekly_hours: number;
  additional_minutes: number; // e.g., 30 mins for TD
  coefficient: number;
  td_required: boolean;
  tp_required: boolean;
  split_group: boolean;
  required_room_type: RoomType;
  source_document: string;
  source_image: string;
  verified: boolean;
  verified_by: string;
  updated_at: string;
  raw_text: string;
  notes?: string;
  color: string;
  category: 'core' | 'languages' | 'sciences' | 'humanities' | 'activities';
}

export interface LegalRule {
  id: string;
  title: string;
  description: string;
  source: string;
  level: GradeLevel | 'all';
  subject: SubjectId | 'all';
  type: 'hard' | 'soft' | 'pedagogical';
  priority: number; // 1 to 5
  active: boolean;
}

export interface PeriodDefinition {
  id: number;
  name: string;
  timeRange: string;
  isMorning: boolean;
}

export interface SubjectPedagogicalDay {
  day: string;
  periodRange: 'morning' | 'afternoon' | 'all_day';
}

export interface InstitutionConfig {
  name: string;
  academicYear: string;
  directorName: string;
  educationDirectorate: string; // مديرية التربية لولاية ...
  commune: string;
  days: string[];
  periods: PeriodDefinition[];
  tuesdayAfternoonOff: boolean;
  enableAmazigh: boolean;
  enableComputerScience: boolean;
  afternoonShiftMode?: 'standard' | 'early_13h' | 'late_14h'; // 13:00-16:00 / 14:00-17:00 / 13:30-16:30
  hasAnnex?: boolean; // مؤسسة ملحقة
  annexName?: string;
  remedialDay?: string; // يوم الاستدراك
  remedialPeriod?: number; // حصة الاستدراك
  subjectPedagogicalDays?: Partial<Record<SubjectId, SubjectPedagogicalDay>>;
}

export interface SchoolClass {
  id: string;
  name: string; // 1AM1, 2AM3, etc.
  level: GradeLevel;
  studentCount: number;
  assignedRoomId?: string;
  hasAmazigh?: boolean;
  isAnnex?: boolean; // قسم تابع لملحقة
  annexName?: string;
}

export interface Teacher {
  id: string;
  name: string;
  subjectId: SubjectId;
  assignedClassIds: string[];
  maxWeeklyHours: number;
  minWeeklyHours: number;
  unavailableSlots: { day: string; period: number; reason?: string }[];
  preferredSlots?: { day: string; period: number }[];
  color?: string;
  phone?: string;
  notes?: string;
  isMultiSchool?: boolean; // أستاذ منتدب أو يدرس بين مؤسستين
  teachesInAnnex?: boolean; // يدرس في ملحقة
  pedagogicalDay?: string; // اليوم البيداغوجي (المحدد بالذكاء الاصطناعي)
  pedagogicalPeriodRange?: 'morning' | 'afternoon' | 'all_day'; // نصف اليوم البيداغوجي
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;
  isShared: boolean;
}

export interface TimetableSlot {
  id: string;
  classId: string;
  subjectId: SubjectId;
  teacherId: string;
  roomId: string;
  day: string;
  period: number;
  type: 'course' | 'td' | 'tp' | 'sport' | 'remedial';
  isGroupSplit: boolean;
  group?: 1 | 2;
  weekParity?: 'all' | 'odd' | 'even';
  isLocked?: boolean;
  isAnnex?: boolean;
}

export interface Conflict {
  id: string;
  type:
    | 'teacher_double_booking'
    | 'class_double_booking'
    | 'room_double_booking'
    | 'hours_mismatch'
    | 'unassigned_subject'
    | 'unavailability_violation'
    | 'split_group_conflict'
    | 'legal_rule_violation'
    | 'max_daily_hours_exceeded';
  severity: 'error' | 'warning';
  title: string;
  description: string;
  affectedItems: {
    teacherId?: string;
    classId?: string;
    roomId?: string;
    day?: string;
    period?: number;
    subjectId?: SubjectId;
  };
  suggestion: string;
}

export interface ValidationItem {
  ruleId: string;
  category: 'timings' | 'coefficients' | 'td_tp_splitting' | 'pedagogy' | 'infrastructure';
  name: string;
  status: 'passed' | 'warning' | 'failed';
  details: string;
  sourceCitation: string;
}

export interface PrincipalDirective {
  id: string;
  key:
    | 'minimize_teacher_gaps'
    | 'tuesday_afternoon_off'
    | 'prefer_morning_core'
    | 'compact_teacher_days'
    | 'avoid_double_heavy'
    | 'balance_weekly_spread'
    | 'custom'
    | string;
  title: string;
  description: string;
  active: boolean;
  source?: 'chat' | 'default' | 'user';
  category?: 'pedagogical' | 'ministerial' | 'custom' | string;
  createdAt?: string;
}

export interface SavedTimetableVersion {
  id: string;
  name: string;
  createdAt: string;
  timestamp?: string;
  slotsCount: number;
  conflictCount?: number;
  slots: TimetableSlot[];
  variationIndex?: number;
  directivesApplied?: string[];
  notes?: string;
}

export interface LegalValidationReport {
  overallScore: number;
  status: 'compliant' | 'minor_issues' | 'non_compliant';
  officialDecreeReference: string;
  totalClasses: number;
  totalTeachers: number;
  totalSlots: number;
  items: ValidationItem[];
  generatedAt: string;
}

export type VoiceCommandActionType =
  | 'MOVE_SLOT'
  | 'SWAP_SLOTS'
  | 'DELETE_SLOT'
  | 'ADD_SLOT'
  | 'CLEAR_ALL'
  | 'REGENERATE'
  | 'MINIMIZE_GAPS'
  | 'REBALANCE'
  | 'SAVE_VERSION'
  | 'TUESDAY_OFF'
  | 'INFO'
  | 'UNKNOWN';

export interface VoiceCommandExecutionResult {
  success: boolean;
  action: VoiceCommandActionType;
  spokenFeedback: string;
  displayMessage: string;
  affectedSlotsCount?: number;
  targetSlot?: TimetableSlot;
  previousSlots?: TimetableSlot[];
  conflictsIntroduced?: number;
  conflictsResolved?: number;
}

export interface VoiceCommandLogItem {
  id: string;
  timestamp: string;
  transcript: string;
  action: VoiceCommandActionType;
  spokenFeedback: string;
  success: boolean;
  previousSlotsBackup?: TimetableSlot[];
}

