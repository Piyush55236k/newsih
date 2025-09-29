import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackEvent } from '../lib/analytics';

const LANGS = [
  { code: 'en-US', label: 'English' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'bn-IN', label: 'Bengali' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' },
];

const detectLangFromText = (s: string): string => {
  if (/[ऀ-ॿ]/u.test(s)) return 'hi-IN';
  if (/[ঀ-৿]/u.test(s)) return 'bn-IN';
  if (/[஀-௿]/u.test(s)) return 'ta-IN';
  if (/[ఀ-౿]/u.test(s)) return 'te-IN';
  return 'en-US';
};

const pickVoiceForLang = (langCode: string): SpeechSynthesisVoice | undefined => {
  const vs = window.speechSynthesis.getVoices();
  return (
    vs.find(v => v.lang === langCode) ||
    vs.find(v => v.lang?.toLowerCase() === langCode.toLowerCase()) ||
    vs.find(v => v.lang?.startsWith(langCode.split('-')[0]))
  );
};

const askAI = async (prompt: string, langHint?: string) => {
  try {
    const r = await fetch('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, lang: langHint }),
    });
    const data = await r.json();
    return data.text || 'Sorry, I could not generate a response.';
  } catch {
    return 'Network error talking to AI service.';
  }
};

export default function FloatingVoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState('en-US');
  const [listening, setListening] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const loadVoices = () => void window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null };
  }, []);

  const speak = (text: string, langOverride?: string) => {
    const chosenLang = langOverride || lang;
    const ut = new SpeechSynthesisUtterance(text);
    ut.lang = chosenLang;
    const voice = pickVoiceForLang(chosenLang);
    if (voice) ut.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(ut);
    trackEvent('tts', { lang: chosenLang, text });
  };

  const supportedSTT = useMemo(() => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }, []);

  const startListen = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onresult = async (ev: any) => {
      const result = ev.results?.[0]?.[0];
      const text: string = result?.transcript ?? '';
      const confidence: number = result?.confidence ?? 1;
      if (!text.trim()) return;
      setLog(l => [...l, 'User: ' + text]);
      trackEvent('stt', { lang: rec.lang, text, confidence });
      if (confidence < 0.4) {
        const msg = rec.lang.startsWith('hi') ? 'कृपया दोहराएँ।' :
                    rec.lang.startsWith('bn') ? 'দয়া করে আবার বলুন।' :
                    rec.lang.startsWith('ta') ? 'தயவு செய்து மீண்டும் சொல்லவும்.' :
                    rec.lang.startsWith('te') ? 'దయచేసి మళ్లీ చెప్పండి.' :
                    'Sorry, please repeat.';
        setLog(l => [...l, 'Assistant: ' + msg]);
        speak(msg, rec.lang);
        return;
      }
      const detectedLang = detectLangFromText(text);
      const reply = await askAI(text, detectedLang);
      setLog(l => [...l, 'Assistant: ' + reply]);
      speak(reply, detectedLang);
    };

    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stopListen = () => { recRef.current?.stop?.(); setListening(false); };

  useEffect(() => () => stopListen(), []);

  return (
    <>
      {/* Floating Voice Assistant Button */}
      <motion.div
        className="floating-voice-btn"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 200, 
          damping: 15,
          delay: 1 
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
      >
        <motion.div
          className="voice-icon"
          animate={{ 
            scale: listening ? [1, 1.2, 1] : 1,
            rotate: listening ? [0, 5, -5, 0] : 0
          }}
          transition={{ 
            duration: 0.5, 
            repeat: listening ? Infinity : 0,
            ease: "easeInOut"
          }}
        >
          🎤
        </motion.div>
        {listening && (
          <motion.div
            className="listening-indicator"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Voice Assistant Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="voice-assistant-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="voice-assistant-modal"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              <div className="voice-assistant-header">
                <h3>🎤 Voice Assistant</h3>
                <div className="voice-controls">
                  <button
                    className="minimize-btn"
                    onClick={() => setIsMinimized(!isMinimized)}
                  >
                    {isMinimized ? '📈' : '📉'}
                  </button>
                  <button
                    className="close-btn"
                    onClick={() => setIsOpen(false)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {!isMinimized && (
                  <motion.div
                    className="voice-assistant-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="voice-settings">
                      <label>Language</label>
                      <select value={lang} onChange={e => setLang(e.target.value)}>
                        {LANGS.map(l => (
                          <option key={l.code} value={l.code}>{l.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="voice-actions">
                      {!supportedSTT && (
                        <p className="warning">Speech recognition not supported in this browser.</p>
                      )}
                      <motion.button
                        className={`voice-btn ${listening ? 'listening' : ''}`}
                        onClick={listening ? stopListen : startListen}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span className="voice-btn-icon">
                          {listening ? '⏹️' : '🎤'}
                        </span>
                        {listening ? 'Stop Listening' : 'Start Listening'}
                      </motion.button>
                    </div>

                    <div className="voice-transcript">
                      <h4>Conversation</h4>
                      {log.length === 0 && <p className="muted">No interactions yet.</p>}
                      <div className="transcript-log">
                        {log.map((l, i) => (
                          <motion.div
                            key={i}
                            className="transcript-item"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.1 }}
                          >
                            {l}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

