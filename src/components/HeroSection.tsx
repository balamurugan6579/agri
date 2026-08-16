import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sprout, Leaf, Sun, CloudRain, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  const { t, isTamil } = useLanguage();

  const steps = [
    { icon: Leaf, titleKey: 'step1Title' as const, descKey: 'step1Desc' as const },
    { icon: Sun, titleKey: 'step2Title' as const, descKey: 'step2Desc' as const },
    { icon: Sprout, titleKey: 'step3Title' as const, descKey: 'step3Desc' as const },
    { icon: CloudRain, titleKey: 'step4Title' as const, descKey: 'step4Desc' as const },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 rounded-full bg-sun/20 animate-float blur-xl" />
      <div className="absolute bottom-40 right-20 w-32 h-32 rounded-full bg-leaf/20 animate-float blur-xl" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full bg-crop/20 animate-float blur-xl" style={{ animationDelay: '4s' }} />

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
                <Sprout className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">
                  {t('appTitle')}
                </h1>
                <p className="text-xs text-primary-foreground/70">Tamil Nadu</p>
              </div>
            </div>
            <LanguageToggle />
          </div>
        </header>

        {/* Hero Content */}
        <main className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm mb-8">
              <span className="text-2xl">🌾</span>
              <span className={cn("text-sm text-primary-foreground/90", isTamil && "font-tamil")}>
                {t('welcome')}
              </span>
            </div>

            <h1 className={cn(
              "text-4xl md:text-6xl font-bold text-primary-foreground mb-6 leading-tight",
              isTamil && "font-tamil"
            )}>
              {t('appSubtitle')}
            </h1>

            <p className="text-lg text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
              {isTamil 
                ? 'மண், வானிலை மற்றும் சந்தை தரவுகளின் அடிப்படையில் அறிவார்ந்த பயிர் பரிந்துரைகளைப் பெறுங்கள்'
                : 'Get intelligent crop recommendations based on soil, weather, and market data'
              }
            </p>

            <Button
              onClick={onGetStarted}
              size="lg"
              className={cn(
                "h-14 px-8 text-lg font-semibold bg-primary-foreground text-primary",
                "hover:bg-primary-foreground/90 transition-all duration-300",
                "shadow-xl hover:shadow-2xl hover:-translate-y-1",
                "group"
              )}
            >
              <span className={isTamil ? "font-tamil" : ""}>{t('getStarted')}</span>
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* How It Works */}
          <div className="mt-20 md:mt-32">
            <h2 className={cn(
              "text-2xl font-bold text-primary-foreground text-center mb-12",
              isTamil && "font-tamil"
            )}>
              {t('howItWorks')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="glass-card bg-primary-foreground/10 backdrop-blur-md rounded-2xl p-6 border border-primary-foreground/20 hover:bg-primary-foreground/15 transition-colors group"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <step.icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-sun">{index + 1}</span>
                    <h3 className={cn(
                      "font-semibold text-primary-foreground",
                      isTamil && "font-tamil"
                    )}>
                      {t(step.titleKey)}
                    </h3>
                  </div>
                  <p className={cn(
                    "text-sm text-primary-foreground/70 leading-relaxed",
                    isTamil && "font-tamil"
                  )}>
                    {t(step.descKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
