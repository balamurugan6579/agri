import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CropRecommendation } from '@/lib/mockRecommendation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Send, Bot, User, Sparkles, Mic, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CHAT_URL } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatbotProps {
  recommendation: CropRecommendation;
}

const SUGGESTIONS = {
  en: ['Why this crop?', 'What fertilizer should I use?', 'What are the risks?', 'Expected price?'],
  ta: ['ஏன் இந்த பயிர்?', 'என்ன உரம் பயன்படுத்த வேண்டும்?', 'ஆபத்துகள் என்ன?', 'எதிர்பார்க்கப்படும் விலை?'],
};

export function Chatbot({ recommendation }: ChatbotProps) {
  const { t, language, isTamil } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const prevCropIdRef = useRef<string>(recommendation?.crop?.id);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Load browser speech synthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      try {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices && availableVoices.length > 0) {
          voicesRef.current = availableVoices;
        }
      } catch (err) {
        console.warn('Unable to load synthesis voices:', err);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    };
  }, []);

  // Set greeting on mount or crop/language change
  useEffect(() => {
    const greeting = language === 'ta'
      ? `${recommendation.crop.nameTa} பரிந்துரை பற்றி உங்களுக்கு விளக்க நான் இங்கே இருக்கிறேன். என்ன கேள்வி கேட்க விரும்புகிறீர்கள்?`
      : `I'm here to help explain the ${recommendation.crop.nameEn} recommendation. What would you like to know?`;

    // If the crop changed, reset messages
    if (prevCropIdRef.current !== recommendation.crop.id) {
      prevCropIdRef.current = recommendation.crop.id;
      setMessages([{ id: '1', role: 'assistant', content: greeting }]);
    } else {
      // If only language changed and only greeting exists, update greeting
      setMessages(prev => {
        if (prev.length <= 1) {
          return [{ id: '1', role: 'assistant', content: greeting }];
        }
        return prev;
      });
    }
  }, [recommendation, language]);

  // Clean up listening & speaking on language switch
  useEffect(() => {
    stopSpeaking();
    stopListening();
  }, [language]);

  // Auto scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
    };
  }, []);

  // Text-To-Speech helper
  const speakText = useCallback((text: string) => {
    if (!isSpeechEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);

      // Clean markdown asterisks and bullets for clean pronunciation
      const cleanText = text
        .replace(/[*#_`>-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const targetLang = language === 'ta' ? 'ta-IN' : 'en-IN';
      utterance.lang = targetLang;

      // Select matching voice if available
      const currentVoices = voicesRef.current.length > 0
        ? voicesRef.current
        : window.speechSynthesis.getVoices();

      if (currentVoices && currentVoices.length > 0) {
        if (language === 'ta') {
          const taVoice = currentVoices.find(v =>
            v.lang.toLowerCase().startsWith('ta') ||
            v.name.toLowerCase().includes('tamil')
          );
          if (taVoice) utterance.voice = taVoice;
        } else {
          const enVoice = currentVoices.find(v =>
            v.lang.toLowerCase().replace('_', '-').startsWith('en-in') ||
            v.name.toLowerCase().includes('india')
          ) || currentVoices.find(v => v.lang.toLowerCase().startsWith('en'));
          if (enVoice) utterance.voice = enVoice;
        }
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      // Timeout prevents Chrome cancel-speak race condition bug
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 50);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      setIsSpeaking(false);
    }
  }, [isSpeechEnabled, language]);

  // Stop current speech playback
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
      setIsSpeaking(false);
    }
  }, []);

  // Toggle voice output on/off
  const toggleSpeech = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (isSpeechEnabled) {
      stopSpeaking();
      setIsSpeechEnabled(false);
    } else {
      setIsSpeechEnabled(true);
    }
  };

  // Stop speech recognition cleanly
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Start speech recognition
  const startListening = () => {
    // If already listening, stop listening (toggle behavior)
    if (isListening) {
      stopListening();
      return;
    }

    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error(
        isTamil
          ? 'உங்கள் உலாவியில் குரல் பதிவு வசதி இல்லை (Web Speech API not supported).'
          : 'Speech recognition is not supported in this browser. Please use Chrome or Edge.'
      );
      return;
    }

    // Stop any existing instance
    stopListening();

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        if (event.results && event.results.length > 0) {
          transcript = event.results[0][0].transcript;
        }

        const trimmedTranscript = transcript.trim();
        if (trimmedTranscript) {
          setInput(prev => {
            const trimmedPrev = prev.trim();
            return trimmedPrev ? `${trimmedPrev} ${trimmedTranscript}` : trimmedTranscript;
          });
          toast.success(
            isTamil
              ? 'குரல் பதிவு செய்யப்பட்டது. சரிபார்த்து அனுப்பவும்.'
              : 'Voice captured. You can review or edit before sending.'
          );
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        recognitionRef.current = null;

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          toast.error(
            isTamil
              ? 'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது. தயவுசெய்து அனுமதி வழங்கவும்.'
              : 'Microphone access denied. Please grant microphone permissions in browser.'
          );
        } else if (event.error === 'no-speech') {
          // User was quiet, no alert needed
        } else if (event.error === 'audio-capture') {
          toast.error(
            isTamil
              ? 'மைக்ரோஃபோன் சாதனம் கிடைக்கவில்லை.'
              : 'No microphone was found on this device.'
          );
        } else {
          toast.error(
            isTamil
              ? `குரல் உள்ளீட்டில் பிழை: ${event.error}`
              : `Voice recognition error: ${event.error}`
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      recognitionRef.current = null;
      toast.error(
        isTamil
          ? 'குரல் பதிவை தொடங்க முடியவில்லை.'
          : 'Unable to start speech recognition.'
      );
    }
  };

  // Unified Message Sending Function
  const sendMessage = async (overrideText?: string) => {
    const rawText = overrideText !== undefined ? overrideText : input;
    const text = rawText.trim();

    if (!text || isTyping) return;

    // If currently listening, stop the microphone
    if (isListening) {
      stopListening();
    }

    // Only clear input if we sent the text from the input box
    if (overrideText === undefined) {
      setInput('');
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          recommendation,
          language,
          conversationHistory: messages
            .filter(m => m.id !== '1')
            .slice(-6)
            .map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) {
        let errorDetail = '';
        try {
          const errData = await resp.json();
          errorDetail = errData.error || '';
        } catch {
          errorDetail = `HTTP ${resp.status}`;
        }

        if (resp.status === 429) {
          toast.error(
            isTamil
              ? 'அதிக கோரிக்கைகள். சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.'
              : 'AI quota exceeded. Please try again in a minute.'
          );
        } else if (resp.status === 401) {
          toast.error(
            isTamil
              ? 'Gemini API விசை தவறானது. backend/.env கோப்பை சரிபார்க்கவும்.'
              : 'Gemini API key is invalid. Please check backend/.env'
          );
        } else if (resp.status === 503) {
          toast.error(
            errorDetail ||
              (isTamil ? 'AI சேவை தற்போது கிடைக்கவில்லை.' : 'AI Service is currently unavailable.')
          );
        } else {
          toast.error(
            errorDetail ||
              (isTamil ? 'பதில் பெறுவதில் பிழை ஏற்பட்டது.' : 'Failed to receive AI response.')
          );
        }

        const assistantErrorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: isTamil
            ? `மன்னிக்கவும், AI சேவையிலிருந்து பதிலை பெற முடியவில்லை (${errorDetail || 'Error'}). தயவுசெய்து சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.`
            : `Sorry, unable to retrieve agricultural advice right now (${errorDetail || 'Error'}). Please try again.`,
        };
        setMessages(prev => [...prev, assistantErrorMsg]);
        return;
      }

      const contentType = resp.headers.get('content-type') || '';
      let assistantReply = '';

      if (contentType.includes('application/json')) {
        const data = await resp.json();
        assistantReply = data.response || '';
      } else {
        assistantReply = await resp.text();
      }

      if (!assistantReply || !assistantReply.trim()) {
        throw new Error('Empty response received from AI');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantReply.trim(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      speakText(assistantReply.trim());
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error(
        isTamil
          ? 'சேவையக இணைப்பு தோல்வியடைந்தது. Flask backend (port 5000) இயங்குகிறதா?'
          : 'Failed to connect to advisory server. Is the Flask backend running on port 5000?'
      );

      const networkErrorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: isTamil
          ? 'மன்னிக்கவும், பின்தள சேவையகம் (Flask Backend) பதிலளிக்கவில்லை. சர்வர் இயங்குவதை உறுதி செய்யவும்.'
          : 'Unable to reach the advisory server. Please ensure the Python Flask backend is running on http://localhost:5000.',
      };
      setMessages(prev => [...prev, networkErrorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestions = SUGGESTIONS[language];

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="gradient-primary p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className={cn("font-semibold text-primary-foreground", isTamil && "font-tamil")}>
            {t('askChatbot')}
          </h3>
          <p className="text-xs text-primary-foreground/70">
            Powered by Gemini AI
          </p>
        </div>
        <Sparkles className="h-5 w-5 text-sun ml-auto" />
        <Button
          variant="ghost"
          size="icon"
          onClick={isSpeaking ? stopSpeaking : toggleSpeech}
          title={
            isSpeaking
              ? (isTamil ? 'ஆடியோவை நிறுத்தவும்' : 'Stop speaking')
              : isSpeechEnabled
              ? (isTamil ? 'ஆடியோ இயக்கத்தில் உள்ளது' : 'Voice output enabled')
              : (isTamil ? 'ஆடியோ முடக்கப்பட்டுள்ளது' : 'Voice output disabled')
          }
          className={cn(
            "text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground relative transition-colors",
            isSpeaking && "bg-primary-foreground/20 text-yellow-300"
          )}
        >
          {isSpeaking ? (
            <Volume2 className="h-5 w-5 animate-pulse text-yellow-300" />
          ) : isSpeechEnabled ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5 opacity-60" />
          )}
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 animate-fade-in",
              message.role === 'user' ? "flex-row-reverse" : ""
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                message.role === 'user'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {message.role === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                message.role === 'user'
                  ? "bg-primary text-primary-foreground rounded-tr-none"
                  : "bg-muted text-foreground rounded-tl-none",
                isTamil && "font-tamil"
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {!isTyping && messages.length <= 2 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => sendMessage(suggestion)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground",
                  "hover:bg-primary hover:text-primary-foreground transition-colors",
                  "border border-border/50",
                  isTamil && "font-tamil"
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border/50">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={startListening}
            title={
              isListening
                ? (isTamil ? 'குரல் பதிவை நிறுத்த கிளிக் செய்யவும்' : 'Click to stop listening')
                : (isTamil ? 'குரல் மூலம் பேச கிளிக் செய்யவும்' : 'Click to speak')
            }
            className={cn(
              "h-12 w-12 shrink-0 border-0 transition-colors",
              isListening
                ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse ring-2 ring-red-500"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            <Mic className={cn("h-5 w-5", isListening && "text-red-500")} />
          </Button>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? (isTamil ? 'கேட்கிறது... பேசவும்...' : 'Listening... Speak now...')
                : t('chatPlaceholder')
            }
            className={cn(
              "flex-1 h-12 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary",
              isTamil && "font-tamil",
              isListening && "ring-1 ring-red-400 placeholder:text-red-500"
            )}
          />

          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            title={isTamil ? 'அனுப்பவும்' : 'Send message'}
            className="h-12 w-12 gradient-primary hover:opacity-90 disabled:opacity-50"
          >
            {isTyping ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
