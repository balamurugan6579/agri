import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CropRecommendation } from '@/lib/mockRecommendation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Send, Bot, User, Sparkles, Mic, Volume2, VolumeX, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { CHAT_URL, DIRECT_BACKEND_CHAT_URL } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatbotProps {
  recommendation: CropRecommendation;
  districtId?: string;
}

const SUGGESTIONS = {
  en: ['Why this crop?', 'What fertilizer should I use?', 'What are the risks?', 'Expected price?'],
  ta: ['ஏன் இந்த பயிர்?', 'என்ன உரம் பயன்படுத்த வேண்டும்?', 'ஆபத்துகள் என்ன?', 'எதிர்பார்க்கப்படும் விலை?'],
};

function getClientFallbackAdvisory(recommendation: CropRecommendation, language: 'ta' | 'en'): string {
  const isTamil = language === 'ta';
  const cropName = isTamil ? recommendation.crop.nameTa : recommendation.crop.nameEn;
  const ph = recommendation.estimatedPH;
  const weather = recommendation.weather;
  const temp = weather?.temperature || '28';
  const rain = weather?.rainfall || '100';
  const confidence = recommendation.confidence || '95';
  const fert = recommendation.fertilizerNote?.[language] || recommendation.fertilizerNote?.en || '';
  const risk = recommendation.riskNote?.[language] || recommendation.riskNote?.en || '';
  const water = recommendation.waterRequirement === 'irrigationRequired'
    ? (isTamil ? 'பாசன வசதி கட்டாயம் தேவை' : 'Irrigation required')
    : (isTamil ? 'மானாவாரி சாகுபடி சாத்தியம்' : 'Rainfed cultivation possible');

  if (isTamil) {
    return (
      `📌 [விதிமுறை அடிப்படையிலான விவசாய வழிகாட்டல் — Gemini AI கிடைக்காததால் கணக்கிடப்பட்ட தரவு]:\n\n` +
      `🌾 **${cropName} ஏன் பரிந்துரைக்கப்படுகிறது?**\n` +
      `• உங்கள் மண்ணின் கார-அமிலத்தன்மை (pH ${ph}) மற்றும் காலநிலை (${temp}°C வெப்பநிலை, ${rain}mm மழை) அடிப்படையில் இயந்திர கற்றல் மாதிரி (ML Model) ${confidence}% நம்பிக்கையுடன் ${cropName} பயிரை பரிந்துரைத்துள்ளது.\n` +
      `• நீர் தேவை: ${water}.\n` +
      `• உர பரிந்துரை: ${fert}\n` +
      `• பாதுகாப்பு குறிப்பு: ${risk}`
    );
  }

  return (
    `📌 [Rule-Based Advisory — Grounded in verified recommendation data while Gemini AI is unavailable]:\n\n` +
    `🌾 **Why ${cropName} is recommended:**\n` +
    `• Based on your soil test (pH ${ph}) and climate conditions (${temp}°C, ${rain}mm rainfall), our machine learning model recommended ${cropName} with ${confidence}% confidence.\n` +
    `• Water Requirement: ${water}.\n` +
    `• Fertilizer Plan: ${fert}\n` +
    `• Precautionary Note: ${risk}`
  );
}

export function Chatbot({ recommendation, districtId }: ChatbotProps) {
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

  const getGreeting = useCallback((lang: 'ta' | 'en') => {
    const cropName = lang === 'ta' ? recommendation.crop.nameTa : recommendation.crop.nameEn;
    return lang === 'ta'
      ? `${cropName} பரிந்துரை பற்றி உங்களுக்கு விளக்க நான் இங்கே இருக்கிறேன். என்ன கேள்வி கேட்க விரும்புகிறீர்கள்?`
      : `I'm here to help explain the ${cropName} recommendation. What would you like to know?`;
  }, [recommendation]);

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

  // Update messages when crop changes or language switches to Tamil/English
  useEffect(() => {
    const greeting = getGreeting(language);

    // If the crop changed, reset messages
    if (prevCropIdRef.current !== recommendation.crop.id) {
      prevCropIdRef.current = recommendation.crop.id;
      setMessages([{ id: '1', role: 'assistant', content: greeting }]);
    } else {
      // When language switches, update greeting and translate any active rule-based advisory
      setMessages(prev => {
        if (prev.length === 0) {
          return [{ id: '1', role: 'assistant', content: greeting }];
        }
        return prev.map(m => {
          if (m.id === '1') {
            return { ...m, content: greeting };
          }
          // Dynamically translate rule-based advisory messages to the newly selected language
          if (m.role === 'assistant' && (m.content.includes('Rule-Based') || m.content.includes('விதிமுறை'))) {
            return {
              ...m,
              content: getClientFallbackAdvisory(recommendation, language),
            };
          }
          return m;
        });
      });
    }
  }, [recommendation, language, getGreeting]);

  // Stop active speech recognition and speech audio on language change
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
            v.lang.toLowerCase().replace('_', '-').startsWith('ta') ||
            v.name.toLowerCase().includes('tamil') ||
            v.name.toLowerCase().includes('valluvar') ||
            v.name.toLowerCase().includes('pallavi')
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

      // Timeout prevents Chrome cancel-speak race condition
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 60);
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

  // Start speech recognition (Web Speech API)
  const startListening = () => {
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
          ? 'உங்கள் உலாவியில் குரல் பதிவு வசதி இல்லை (Web Speech API not supported). Google Chrome அல்லது Edge பயன்படுத்தவும்.'
          : 'Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.'
      );
      return;
    }

    stopListening();

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Set target language: Tamil ('ta-IN') or English ('en-IN')
      recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;

      let finalCapturedSpeech = '';

      recognition.onstart = () => {
        setIsListening(true);
        toast.info(
          language === 'ta'
            ? 'மைக்ரோஃபோன் இயங்குகிறது... தமிழில் பேசவும்.'
            : 'Microphone active... Speak your question now.'
        );
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalCapturedSpeech += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const liveTranscript = (finalCapturedSpeech + ' ' + interimTranscript).trim();
        if (liveTranscript) {
          setInput(liveTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        recognitionRef.current = null;

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          toast.error(
            isTamil
              ? 'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது. உலாவியில் மைக்ரோஃபோன் அனுமதியை இயக்கவும்.'
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
        if (finalCapturedSpeech.trim()) {
          toast.success(
            language === 'ta'
              ? 'குரல் பதிவு செய்யப்பட்டது! சரிபார்த்து அனுப்பலாம்.'
              : 'Voice recorded! Review or edit before sending.'
          );
        }
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

  // Reset chat conversation
  const resetChat = () => {
    stopSpeaking();
    stopListening();
    setMessages([{ id: '1', role: 'assistant', content: getGreeting(language) }]);
    toast.info(isTamil ? 'அரட்டை மீட்டமைக்கப்பட்டது.' : 'Chat reset.');
  };

  // Unified Message Sending Function
  const sendMessage = async (overrideText?: string) => {
    const rawText = overrideText !== undefined ? overrideText : input;
    const text = rawText.trim();

    if (!text || isTyping) return;

    if (isListening) {
      stopListening();
    }

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

    const payload = {
      query: text,
      recommendation: {
        ...recommendation,
        district: districtId || (recommendation as any).district || '',
      },
      language,
      conversationHistory: messages
        .filter(m => m.id !== '1')
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content })),
    };

    try {
      let resp: Response;

      try {
        resp = await fetch(CHAT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if ((resp.status === 405 || resp.status === 404) && CHAT_URL !== DIRECT_BACKEND_CHAT_URL) {
          console.warn(`Primary chat endpoint (${CHAT_URL}) returned HTTP ${resp.status}. Retrying direct backend ${DIRECT_BACKEND_CHAT_URL}...`);
          resp = await fetch(DIRECT_BACKEND_CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      } catch (networkFetchErr) {
        if (CHAT_URL !== DIRECT_BACKEND_CHAT_URL) {
          console.warn(`Connecting to ${CHAT_URL} failed. Retrying direct backend ${DIRECT_BACKEND_CHAT_URL}...`, networkFetchErr);
          resp = await fetch(DIRECT_BACKEND_CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } else {
          throw networkFetchErr;
        }
      }

      if (!resp.ok) {
        let errorDetail = '';
        try {
          const errData = await resp.json();
          errorDetail = errData.error || '';
        } catch {
          errorDetail = `HTTP ${resp.status}`;
        }

        const fallbackResponse = getClientFallbackAdvisory(recommendation, language);
        const assistantErrorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fallbackResponse,
        };
        setMessages(prev => [...prev, assistantErrorMsg]);
        speakText(fallbackResponse);
        return;
      }

      const contentType = resp.headers.get('content-type') || '';
      let assistantReply = '';

      if (contentType.includes('application/json')) {
        const data = await resp.json();
        assistantReply = data.response || '';
        if (data.is_fallback) {
          toast.info(
            isTamil
              ? 'விதிமுறை அடிப்படையிலான விவசாய வழிகாட்டல் காட்டப்படுகிறது.'
              : 'Rule-based crop advisory displayed.'
          );
        }
      } else {
        assistantReply = await resp.text();
      }

      if (!assistantReply || !assistantReply.trim()) {
        assistantReply = getClientFallbackAdvisory(recommendation, language);
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
      const fallbackResponse = getClientFallbackAdvisory(recommendation, language);
      const assistantFallbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackResponse,
      };
      setMessages(prev => [...prev, assistantFallbackMsg]);
      speakText(fallbackResponse);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle clicking suggestions with enriched question containing crop, soil, and weather details
  const handleSuggestionClick = (suggestionText: string, index: number) => {
    const cropName = language === 'ta' ? recommendation.crop.nameTa : recommendation.crop.nameEn;
    const ph = recommendation.estimatedPH;
    const weather = recommendation.weather;
    const temp = weather?.temperature;
    const rain = weather?.rainfall;

    let question = suggestionText;

    if (index === 0) {
      // "Why this crop?" / "ஏன் இந்த பயிர்?"
      if (language === 'ta') {
        question = `இந்த மண் (pH ${ph}) மற்றும் வானிலைக்கு (${temp}°C, ${rain}mm மழை) ${cropName} பயிர் ஏன் பரிந்துரைக்கப்படுகிறது? இதன் சிறப்பம்சங்கள் என்ன?`;
      } else {
        question = `Why is ${cropName} recommended for this soil (pH ${ph}) and weather conditions (${temp}°C, ${rain}mm rainfall)? Explain its advantages.`;
      }
    } else if (index === 1) {
      // "What fertilizer should I use?" / "என்ன உரம் பயன்படுத்த வேண்டும்?"
      if (language === 'ta') {
        question = `${cropName} பயிருக்கு சிறந்த மகசூல் பெற என்ன உரம் மற்றும் சத்துக்களை எந்த அளவில் பயன்படுத்த வேண்டும்?`;
      } else {
        question = `What fertilizers and nutrient dosages should I use for optimal yield of ${cropName}?`;
      }
    } else if (index === 2) {
      // "What are the risks?" / "ஆபத்துகள் என்ன?"
      if (language === 'ta') {
        question = `${cropName} சாகுபடியில் வரக்கூடிய முக்கிய பூச்சி, நோய் அல்லது காலநிலை ஆபத்துகள் மற்றும் தடுப்பு முறைகள் என்ன?`;
      } else {
        question = `What are the potential pests, diseases, or weather risks for ${cropName} and how can I prevent them?`;
      }
    } else if (index === 3) {
      // "Expected price?" / "எதிர்பார்க்கப்படும் விலை?"
      if (language === 'ta') {
        question = `${cropName} பயிருக்கு அறுவடை காலத்தில் எதிர்பார்க்கப்படும் சந்தை விலை என்ன மற்றும் லாபத்தை அதிகரிக்க வழிமுறைகள் என்ன?`;
      } else {
        question = `What is the expected market price for ${cropName} at harvest and how can I maximize profitability?`;
      }
    }

    sendMessage(question);
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
          <p className={cn("text-xs text-primary-foreground/70", isTamil && "font-tamil")}>
            {isTamil ? 'Gemini AI மூலம் இயங்குகிறது' : 'Powered by Gemini AI'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={resetChat}
            title={isTamil ? 'அரட்டையை மீட்டமைக்கவும்' : 'Reset chat'}
            className="text-primary-foreground/80 hover:bg-primary-foreground/20 hover:text-primary-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={isSpeaking ? stopSpeaking : toggleSpeech}
            title={
              isSpeaking
                ? (isTamil ? 'ஆடியோவை நிறுத்தவும்' : 'Stop speaking')
                : isSpeechEnabled
                ? (isTamil ? 'குரல் வெளியீடு இயக்கத்தில் உள்ளது' : 'Voice output enabled')
                : (isTamil ? 'குரல் வெளியீடு முடக்கப்பட்டுள்ளது' : 'Voice output disabled')
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
                onClick={() => handleSuggestionClick(suggestion, index)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground",
                  "hover:bg-primary hover:text-primary-foreground transition-colors",
                  "border border-border/50 shadow-sm",
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
                ? (isTamil ? '🎤 கேட்கிறது... தமிழில் பேசவும்...' : '🎤 Listening... Speak now...')
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
