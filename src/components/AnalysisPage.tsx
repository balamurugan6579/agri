import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { SoilInputForm } from './SoilInputForm';
import { RecommendationCard } from './RecommendationCard';
import { Chatbot } from './Chatbot';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sprout, ArrowLeft, RotateCcw } from 'lucide-react';
import { SoilInput, CropRecommendation, generateRecommendation } from '@/lib/mockRecommendation';

interface AnalysisPageProps {
  onBack: () => void;
}

export function AnalysisPage({ onBack }: AnalysisPageProps) {
  const { t, isTamil } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<CropRecommendation[] | null>(null);
  const [lastInput, setLastInput] = useState<SoilInput | null>(null);

  const handleSubmit = async (data: SoilInput) => {
    setIsLoading(true);
    setLastInput(data);

    // Real API call or fallback
    const result = await generateRecommendation(data);
    setRecommendations(result);
    setIsLoading(false);
  };

  const handleReset = () => {
    setRecommendations(null);
    setLastInput(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-muted"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Sprout className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">
                    {t('appTitle')}
                  </h1>
                  <p className="text-xs text-muted-foreground">Tamil Nadu</p>
                </div>
              </div>
            </div>
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!recommendations ? (
          <div className="max-w-2xl mx-auto">
            <div className="glass-card rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                  <Sprout className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className={cn("text-xl font-bold text-foreground", isTamil && "font-tamil")}>
                    {t('analyze')}
                  </h2>
                  <p className={cn("text-sm text-muted-foreground", isTamil && "font-tamil")}>
                    {isTamil
                      ? 'உங்கள் மண் விவரங்களை உள்ளிடவும்'
                      : 'Enter your soil details to get recommendations'
                    }
                  </p>
                </div>
              </div>
              <SoilInputForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Recommendation */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className={cn("text-2xl font-bold text-foreground", isTamil && "font-tamil")}>
                  {t('recommendation')}
                </h2>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className={cn("gap-2", isTamil && "font-tamil")}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('newAnalysis')}
                </Button>
              </div>
              {recommendations.map((rec, idx) => (
                <div key={rec.crop.id} className="relative">
                  {idx === 0 && (
                    <div className="absolute -top-3 left-4 z-10 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full shadow-md font-bold">
                      {isTamil ? 'சிறந்த தேர்வு' : 'Top Choice'}
                    </div>
                  )}
                  <RecommendationCard
                    recommendation={rec}
                    districtId={lastInput?.district || ''}
                  />
                </div>
              ))}
            </div>

            {/* Right Column - Chatbot */}
            <div>
              <Chatbot
                recommendation={recommendations[0]}
                districtId={lastInput?.district}
              />
            </div>
          </div>
        )
        }
      </main >
    </div >
  );
}
