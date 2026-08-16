import { useState } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { HeroSection } from '@/components/HeroSection';
import { AnalysisPage } from '@/components/AnalysisPage';

type View = 'hero' | 'analysis';

function CropSmartApp() {
  const [view, setView] = useState<View>('hero');

  return (
    <>
      {view === 'hero' && (
        <HeroSection onGetStarted={() => setView('analysis')} />
      )}
      {view === 'analysis' && (
        <AnalysisPage onBack={() => setView('hero')} />
      )}
    </>
  );
}

const Index = () => {
  return (
    <LanguageProvider>
      <CropSmartApp />
    </LanguageProvider>
  );
};

export default Index;
