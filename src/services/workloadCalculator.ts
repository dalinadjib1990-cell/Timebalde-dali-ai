import { Teacher, SchoolClass, SubjectRule, SubjectId, GradeLevel } from '../types';

export interface TeacherWorkloadReport {
  teacherId: string;
  teacherName: string;
  subjectId: SubjectId;
  assignedClassesCount: number;
  calculatedRequiredHours: number;
  maxWeeklyHours: number;
  minWeeklyHours: number;
  actualScheduledHours: number;
  status: 'matched' | 'overloaded' | 'underloaded';
  difference: number;
  details: {
    classId: string;
    className: string;
    level: GradeLevel;
    officialHours: number;
    tdHours: number;
  }[];
}

export function calculateTeacherWorkload(
  teacher: Teacher,
  classes: SchoolClass[],
  rules: SubjectRule[]
): TeacherWorkloadReport {
  const classMap = new Map(classes.map((c) => [c.id, c]));
  let totalHours = 0;

  const details = teacher.assignedClassIds.map((cId) => {
    const cls = classMap.get(cId);
    if (!cls) {
      return {
        classId: cId,
        className: cId,
        level: '1AM' as GradeLevel,
        officialHours: 0,
        tdHours: 0,
      };
    }

    const rule = rules.find(
      (r) => r.subject_id === teacher.subjectId && r.level === cls.level
    );

    const officialHours = rule ? rule.weekly_hours : 0;
    const tdHours = rule && rule.additional_minutes > 0 ? rule.additional_minutes / 60 : 0;
    totalHours += officialHours;

    return {
      classId: cls.id,
      className: cls.name,
      level: cls.level,
      officialHours,
      tdHours,
    };
  });

  const diff = totalHours - teacher.maxWeeklyHours;
  let status: 'matched' | 'overloaded' | 'underloaded' = 'matched';

  if (totalHours > teacher.maxWeeklyHours) {
    status = 'overloaded';
  } else if (totalHours < teacher.minWeeklyHours && totalHours > 0) {
    status = 'underloaded';
  } else {
    status = 'matched';
  }

  return {
    teacherId: teacher.id,
    teacherName: teacher.name,
    subjectId: teacher.subjectId,
    assignedClassesCount: teacher.assignedClassIds.length,
    calculatedRequiredHours: totalHours,
    maxWeeklyHours: teacher.maxWeeklyHours,
    minWeeklyHours: teacher.minWeeklyHours,
    actualScheduledHours: totalHours,
    status,
    difference: diff,
    details,
  };
}

export function calculateAllTeachersWorkloads(
  teachers: Teacher[],
  classes: SchoolClass[],
  rules: SubjectRule[]
): TeacherWorkloadReport[] {
  return teachers.map((t) => calculateTeacherWorkload(t, classes, rules));
}
