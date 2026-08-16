import React from 'react';
import {
  BookOpen,
  Globe,
  Languages,
  Sparkles,
  Calculator,
  Microscope,
  Atom,
  History,
  Compass,
  Moon,
  Scale,
  Palette,
  Trophy,
  Monitor,
  GraduationCap,
} from 'lucide-react';
import { SubjectId } from '../types';

interface Props {
  subjectId: SubjectId | string;
  className?: string;
}

export const SubjectIcon: React.FC<Props> = ({ subjectId, className = 'w-4 h-4' }) => {
  switch (subjectId) {
    case 'arabic':
      return <BookOpen className={className} />;
    case 'english':
      return <Globe className={className} />;
    case 'french':
      return <Languages className={className} />;
    case 'amazigh':
      return <Sparkles className={className} />;
    case 'math':
      return <Calculator className={className} />;
    case 'science':
      return <Microscope className={className} />;
    case 'physics':
      return <Atom className={className} />;
    case 'history':
      return <History className={className} />;
    case 'geography':
      return <Compass className={className} />;
    case 'islamic':
      return <Moon className={className} />;
    case 'civic':
      return <Scale className={className} />;
    case 'art_music':
      return <Palette className={className} />;
    case 'pe':
      return <Trophy className={className} />;
    case 'computer':
      return <Monitor className={className} />;
    default:
      return <GraduationCap className={className} />;
  }
};
