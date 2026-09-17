// Browser Speech Recognition Service with Arabic Support (ar-DZ / ar-SA)

export type SpeechCallback = (transcript: string, isFinal: boolean) => void;
export type StatusCallback = (status: 'listening' | 'idle' | 'processing' | 'error', message?: string) => void;

class SpeechRecognitionService {
  private recognition: any = null;
  private isListening: boolean = false;
  private onResultCallback: SpeechCallback | null = null;
  private onStatusCallback: StatusCallback | null = null;
  private selectedLanguage: string = 'ar-DZ'; // Default to Algerian Arabic / Modern Standard Arabic

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.selectedLanguage;
        this.recognition.maxAlternatives = 3;

        this.recognition.onstart = () => {
          this.isListening = true;
          this.notifyStatus('listening');
        };

        this.recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            if (this.onResultCallback) {
              this.onResultCallback(finalTranscript.trim(), true);
            }
          } else if (interimTranscript) {
            if (this.onResultCallback) {
              this.onResultCallback(interimTranscript.trim(), false);
            }
          }
        };

        this.recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition error:', event.error);
          let userMsg = 'حدث خطأ في التقاط الصوت';
          if (event.error === 'not-allowed') {
            userMsg = 'يرجى السماح بصلاحية الميكروفون في المتصفح لاستخدام التحكم الصوتي';
          } else if (event.error === 'no-speech') {
            userMsg = 'لم يتم رصد أي صوت، يرجى إعادة المحاولة والتحدث بوضوح';
          } else if (event.error === 'network') {
            userMsg = 'خطأ في اتصال شبكة التعرف على الصوت';
          }
          this.notifyStatus('error', userMsg);
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.notifyStatus('idle');
        };
      } catch (err) {
        console.error('Failed to initialize SpeechRecognition:', err);
      }
    }
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  public setLanguage(lang: 'ar-DZ' | 'ar-SA' | 'ar') {
    this.selectedLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public getLanguage(): string {
    return this.selectedLanguage;
  }

  public start(onResult: SpeechCallback, onStatus?: StatusCallback): boolean {
    if (!this.recognition) {
      this.initRecognition();
    }
    if (!this.recognition) {
      if (onStatus) {
        onStatus('error', 'متصفحك لا يدعم خاصية التعرف على الصوت Web Speech API، يمكنك كتابة الأمر يدوياً.');
      }
      return false;
    }

    this.onResultCallback = onResult;
    if (onStatus) this.onStatusCallback = onStatus;

    try {
      if (this.isListening) {
        this.recognition.stop();
      }
      this.recognition.lang = this.selectedLanguage;
      this.recognition.start();
      return true;
    } catch (err) {
      console.warn('Recognition start exception:', err);
      try {
        this.recognition.start();
        return true;
      } catch (e) {
        this.notifyStatus('error', 'تعذر تشغيل الميكروفون، يرجى التحقق من الأذونات');
        return false;
      }
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        // Ignore
      }
    }
    this.isListening = false;
    this.notifyStatus('idle');
  }

  public abort() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (err) {}
    }
    this.isListening = false;
    this.notifyStatus('idle');
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  private notifyStatus(status: 'listening' | 'idle' | 'processing' | 'error', message?: string) {
    if (this.onStatusCallback) {
      this.onStatusCallback(status, message);
    }
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
