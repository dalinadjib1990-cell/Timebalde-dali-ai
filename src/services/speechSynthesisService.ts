// Text-to-Speech Synthesis Service with Arabic voice support for DALI AI

class SpeechSynthesisService {
  private synth: SpeechSynthesis | null = null;
  private isEnabled: boolean = true;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private arabicVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
      const saved = localStorage.getItem('dali_voice_feedback_enabled');
      if (saved !== null) {
        this.isEnabled = saved === 'true';
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    try {
      const allVoices = this.synth.getVoices();
      this.arabicVoices = allVoices.filter(
        (v) => v.lang.startsWith('ar') || v.lang.includes('Arabic') || v.name.toLowerCase().includes('arabic')
      );
    } catch (e) {
      // Ignore
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem('dali_voice_feedback_enabled', String(enabled));
    if (!enabled) {
      this.stop();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public toggleEnabled(): boolean {
    this.setEnabled(!this.isEnabled);
    return this.isEnabled;
  }

  public speak(text: string, onEnd?: () => void) {
    if (!this.isEnabled || !this.synth || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    try {
      this.synth.cancel(); // Stop any pending speech

      // Clean markdown stars/brackets for cleaner natural Arabic reading
      const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#{1,6}\s?/g, '')
        .replace(/\[.*?\]\(.*?\)/g, '')
        .replace(/`.*?`/g, '')
        .replace(/[•-]\s/g, ' ')
        .replace(/\n+/g, '. ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'ar-SA';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      if (this.arabicVoices.length > 0) {
        // Prefer Algerian, Saudi, or Google Arabic voice
        const preferred =
          this.arabicVoices.find((v) => v.lang === 'ar-DZ') ||
          this.arabicVoices.find((v) => v.lang === 'ar-SA') ||
          this.arabicVoices.find((v) => v.name.includes('Google') || v.name.includes('Natural')) ||
          this.arabicVoices[0];
        if (preferred) {
          utterance.voice = preferred;
          utterance.lang = preferred.lang;
        }
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis utterance error:', e);
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      if (onEnd) onEnd();
    }
  }

  public stop() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
    this.currentUtterance = null;
  }
}

export const speechSynthesisService = new SpeechSynthesisService();
