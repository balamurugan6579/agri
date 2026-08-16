import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { UI_TRANSLATIONS, Language, TranslationKey } from '@/lib/constants';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isTamil: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: TranslationKey): string => {
    return UI_TRANSLATIONS[language][key] || key;
  }, [language]);

  const isTamil = language === 'ta';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isTamil }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
