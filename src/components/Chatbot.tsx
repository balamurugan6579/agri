import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CropRecommendation } from '@/lib/mockRecommendation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Send, Bot, User, Sparkles, Mic, Volume2, VolumeX } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const greeting = language === 'ta'
      ? `${recommendation.crop.nameTa} பரிந்துரை பற்றி உங்களுக்கு விளக்க நான் இங்கே இருக்கிறேன். என்ன கேள்வி கேட்க விரும்புகிறீர்கள்?`
      : `I'm here to help explain the ${recommendation.crop.nameEn} recommendation. What would you like to know?`;

    setMessages([{ id: '1', role: 'assistant', content: greeting }]);
  }, [recommendation, language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (isSpeechEnabled && lastMessage?.role === 'assistant' && lastMessage.id !== 'streaming') {
      const utterance = new SpeechSynthesisUtterance(lastMessage.content);
      utterance.lang = isTamil ? 'ta-IN' : 'en-IN';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, [messages, isSpeechEnabled, isTamil]);

  const startListening = () => {
    if (!window.isSecureContext) {
      toast.error(
        isTamil
          ? 'குரல் பதிவுக்காக HTTPS தேவை. பாதுகாப்பான தளத்தில் முயற்சிக்கவும்.'
          : 'Voice input requires HTTPS. Please try on a secure site.'
      );
      return;
    }
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = isTamil ? 'ta-IN' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error(isTamil ? 'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது.' : 'Microphone access denied.');
        } else if (event.error === 'no-speech') {
          // specific handling or ignore
        } else {
          toast.error(isTamil ? 'குரல் உள்ளீட்டில் பிழை.' : 'Error in voice input: ' + event.error);
        }
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSend(transcript);
      };

      try {
        recognition.start();
      } catch (e) {
        console.error("Speech recognition start failed", e);
        toast.error("Failed to start voice input");
      }
    } else {
      toast.error(isTamil ? 'உங்கள் உலாவியில் குரல் பதிவு வசதி இல்லை.' : 'Speech recognition not supported in this browser.');
    }
  };

  const toggleSpeech = () => {
    if (isSpeechEnabled) {
      window.speechSynthesis.cancel();
    }
    setIsSpeechEnabled(!isSpeechEnabled);
  };

  const streamChat = async (query: string) => {
    const conversationHistory = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        recommendation,
        language,
        conversationHistory
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      if (resp.status === 429) {
        toast.error(language === 'ta' ? 'அதிக கோரிக்கைகள். பின்னர் முயற்சிக்கவும்.' : 'Too many requests. Please try again later.');
      } else if (resp.status === 402) {
        toast.error(language === 'ta' ? 'AI கிரெடிட்கள் தீர்ந்துவிட்டன.' : 'AI credits exhausted.');
      } else if (resp.status === 503) {
        toast.error(errorData.error || (language === 'ta' ? 'AI சேவை கிடைக்கவில்லை.' : 'AI Service Unavailable'));
      } else {
        toast.error(errorData.error || 'Failed to get response');
      }
      throw new Error(errorData.error || 'Request failed');
    }

    // Handle JSON response (Flask backend)
    const contentType = resp.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await resp.json();
      setMessages(prev => {
        // Remove the streaming placeholder if it exists, or add new message
        return [...prev, { id: Date.now().toString(), role: 'assistant', content: data.response }];
      });
      return;
    }

    // Handle Streaming response (Supabase Edge Function)
    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    // create a placeholder message for streaming
    setMessages(prev => [...prev, { id: "streaming", role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              return prev.map(m => m.id === "streaming" ? { ...m, content: assistantContent } : m);
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Finalize streaming message with proper ID
    setMessages(prev => prev.map(m => m.id === "streaming" ? { ...m, id: Date.now().toString() } : m));
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      await streamChat(text);
    } catch (error: any) {
      console.error('Chat error:', error);
      // Only show generic error if it's not a known API error we already toasted
      if (!error.message || (!error.message.includes('AI quota') && !error.message.includes('Request failed'))) {
        toast.error(isTamil ? 'செய்தி அனுப்புவதில் பிழை. சர்வர் இணைப்பை சரிபார்க்கவும்.' : 'Failed to connect to server. Is the backend running?');
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
          onClick={toggleSpeech}
          className="text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
        >
          {isSpeechEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
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

        {isTyping && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex gap-1">
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
                onClick={() => handleSend(suggestion)}
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
            variant="outline"
            size="icon"
            onClick={startListening}
            className={cn(
              "h-12 w-12 shrink-0 border-0 bg-muted hover:bg-muted/80",
              isListening && "text-red-500 animate-pulse"
            )}
          >
            <Mic className="h-5 w-5" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('chatPlaceholder')}
            className={cn(
              "flex-1 h-12 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary",
              isTamil && "font-tamil"
            )}
            disabled={isTyping}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="h-12 w-12 gradient-primary hover:opacity-90"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
