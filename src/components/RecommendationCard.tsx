import { useLanguage } from '@/contexts/LanguageContext';
import { CropRecommendation } from '@/lib/mockRecommendation';
import { TAMIL_NADU_DISTRICTS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  Thermometer, 
  Droplets, 
  Beaker, 
  AlertTriangle, 
  CheckCircle2,
  Sprout,
  IndianRupee,
  CloudRain,
  Leaf
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RecommendationCardProps {
  recommendation: CropRecommendation;
  districtId: string;
}

export function RecommendationCard({ recommendation, districtId }: RecommendationCardProps) {
  const { t, language, isTamil } = useLanguage();
  const district = TAMIL_NADU_DISTRICTS.find(d => d.id === districtId);

  const getConfidenceBadgeVariant = () => {
    switch (recommendation.confidenceLevel) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
    }
  };

  const getSuitabilityIcon = (level: 'suitable' | 'moderate' | 'needsAttention') => {
    switch (level) {
      case 'suitable': return <CheckCircle2 className="h-4 w-4 text-leaf" />;
      case 'moderate': return <AlertTriangle className="h-4 w-4 text-sun" />;
      case 'needsAttention': return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
  };

  const getSuitabilityText = (level: 'suitable' | 'moderate' | 'needsAttention') => {
    switch (level) {
      case 'suitable': return t('suitable');
      case 'moderate': return t('moderate');
      case 'needsAttention': return t('needsAttention');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main Recommendation */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className={cn("text-sm text-muted-foreground mb-1", isTamil && "font-tamil")}>
                {t('recommendedCrop')}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{recommendation.crop.icon}</span>
                <h2 className={cn("text-3xl font-bold text-foreground", isTamil && "font-tamil")}>
                  {language === 'ta' ? recommendation.crop.nameTa : recommendation.crop.nameEn}
                </h2>
              </div>
            </div>
            <Badge 
              variant={getConfidenceBadgeVariant()} 
              className={cn(
                "text-sm px-3 py-1",
                recommendation.confidenceLevel === 'high' && "bg-leaf text-primary-foreground",
                recommendation.confidenceLevel === 'medium' && "bg-sun text-accent-foreground"
              )}
            >
              {recommendation.confidence}% {t(recommendation.confidenceLevel)}
            </Badge>
          </div>

          {/* District Success */}
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg mb-4",
            recommendation.isSuccessInDistrict ? "bg-leaf/10" : "bg-sun/10"
          )}>
            {recommendation.isSuccessInDistrict ? (
              <CheckCircle2 className="h-5 w-5 text-leaf flex-shrink-0" />
            ) : (
              <TrendingUp className="h-5 w-5 text-sun flex-shrink-0" />
            )}
            <p className={cn("text-sm", isTamil && "font-tamil")}>
              {recommendation.isSuccessInDistrict ? t('successInDistrict') : t('alternativeCrop')}
            </p>
          </div>

          {/* Weather & Soil Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="h-4 w-4 text-primary" />
                <span className={cn("text-sm font-medium", isTamil && "font-tamil")}>
                  {t('weatherSuitability')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getSuitabilityIcon(recommendation.weatherSuitability)}
                <span className={cn("text-sm", isTamil && "font-tamil")}>
                  {getSuitabilityText(recommendation.weatherSuitability)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {recommendation.weather.temperature}°C • {recommendation.weather.humidity}% humidity
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Beaker className="h-4 w-4 text-primary" />
                <span className={cn("text-sm font-medium", isTamil && "font-tamil")}>
                  {t('soilSuitability')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getSuitabilityIcon(recommendation.soilSuitability)}
                <span className={cn("text-sm", isTamil && "font-tamil")}>
                  {getSuitabilityText(recommendation.soilSuitability)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                pH {recommendation.estimatedPH}
              </p>
            </div>
          </div>

          {/* Water Requirement */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <CloudRain className="h-4 w-4 text-water" />
            <span className={cn(isTamil && "font-tamil")}>
              {t(recommendation.waterRequirement)}
            </span>
            <span className="text-muted-foreground">
              ({recommendation.weather.rainfall}mm rainfall)
            </span>
          </div>
        </div>
      </div>

      {/* Price Information */}
      <div className="glass-card rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-crop" />
              <span className={cn("text-sm font-medium text-foreground", isTamil && "font-tamil")}>
                {t('currentPrice')}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              ₹{recommendation.currentPrice.min.toLocaleString()} - ₹{recommendation.currentPrice.max.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{t('perQuintal')}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-leaf" />
              <span className={cn("text-sm font-medium text-foreground", isTamil && "font-tamil")}>
                {t('harvestPrice')}
              </span>
            </div>
            <p className="text-2xl font-bold text-leaf">
              ₹{recommendation.harvestPrice.min.toLocaleString()} - ₹{recommendation.harvestPrice.max.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{t('perQuintal')}</p>
          </div>
        </div>
        <p className={cn("text-xs text-muted-foreground mt-4 italic", isTamil && "font-tamil")}>
          {t('priceDisclaimer')}
        </p>
      </div>

      {/* Fertilizer & Risk Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Leaf className="h-5 w-5 text-leaf" />
            <h3 className={cn("font-semibold text-foreground", isTamil && "font-tamil")}>
              {t('fertilizerNote')}
            </h3>
          </div>
          <p className={cn("text-sm text-muted-foreground leading-relaxed", isTamil && "font-tamil")}>
            {language === 'ta' ? recommendation.fertilizerNote.ta : recommendation.fertilizerNote.en}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-sun" />
            <h3 className={cn("font-semibold text-foreground", isTamil && "font-tamil")}>
              {t('riskNote')}
            </h3>
          </div>
          <p className={cn("text-sm text-muted-foreground leading-relaxed", isTamil && "font-tamil")}>
            {language === 'ta' ? recommendation.riskNote.ta : recommendation.riskNote.en}
          </p>
        </div>
      </div>
    </div>
  );
}
