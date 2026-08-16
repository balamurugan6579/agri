import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DistrictSelector } from './DistrictSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Beaker, Leaf, Droplets, FlaskConical, Loader2 } from 'lucide-react';
import { SoilInput } from '@/lib/mockRecommendation';
import { cn } from '@/lib/utils';

interface SoilInputFormProps {
  onSubmit: (data: SoilInput) => void;
  isLoading: boolean;
}

export function SoilInputForm({ onSubmit, isLoading }: SoilInputFormProps) {
  const { t, isTamil } = useLanguage();
  const [district, setDistrict] = useState('');
  const [nitrogen, setNitrogen] = useState('');
  const [phosphorus, setPhosphorus] = useState('');
  const [potassium, setPotassium] = useState('');
  const [ph, setPh] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!district || !nitrogen || !phosphorus || !potassium) {
      setError(t('inputRequired'));
      return;
    }

    onSubmit({
      district,
      nitrogen: parseFloat(nitrogen),
      phosphorus: parseFloat(phosphorus),
      potassium: parseFloat(potassium),
      ph: ph ? parseFloat(ph) : undefined,
    });
  };

  const inputFields = [
    {
      id: 'nitrogen',
      label: t('nitrogen'),
      value: nitrogen,
      onChange: setNitrogen,
      icon: Leaf,
      iconColor: 'text-leaf',
      placeholder: '0-300',
    },
    {
      id: 'phosphorus',
      label: t('phosphorus'),
      value: phosphorus,
      onChange: setPhosphorus,
      icon: FlaskConical,
      iconColor: 'text-water',
      placeholder: '0-150',
    },
    {
      id: 'potassium',
      label: t('potassium'),
      value: potassium,
      onChange: setPotassium,
      icon: Droplets,
      iconColor: 'text-crop',
      placeholder: '0-300',
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DistrictSelector value={district} onChange={setDistrict} />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Beaker className="h-5 w-5 text-primary" />
          <h3 className={cn("font-semibold text-foreground", isTamil && "font-tamil")}>
            {t('soilNutrients')}
          </h3>
          <span className="text-xs text-muted-foreground">({t('kgPerHectare')})</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {inputFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label 
                htmlFor={field.id} 
                className={cn("flex items-center gap-2 text-sm", isTamil && "font-tamil")}
              >
                <field.icon className={cn("h-4 w-4", field.iconColor)} />
                {field.label}
              </Label>
              <Input
                id={field.id}
                type="number"
                min="0"
                step="0.1"
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className="h-12 bg-card border-border/50 hover:border-primary/50 focus:border-primary transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label 
          htmlFor="ph" 
          className={cn("flex items-center gap-2 text-sm text-muted-foreground", isTamil && "font-tamil")}
        >
          <Beaker className="h-4 w-4" />
          {t('soilPH')}
        </Label>
        <Input
          id="ph"
          type="number"
          min="0"
          max="14"
          step="0.1"
          placeholder="4.5 - 9.0"
          value={ph}
          onChange={(e) => setPh(e.target.value)}
          className="h-12 bg-card border-border/50 hover:border-primary/50 focus:border-primary transition-colors md:w-1/3"
        />
      </div>

      {error && (
        <p className={cn("text-sm text-destructive", isTamil && "font-tamil")}>
          {error}
        </p>
      )}

      <Button 
        type="submit" 
        disabled={isLoading}
        className="w-full h-14 text-lg font-semibold gradient-primary hover:opacity-90 transition-opacity shadow-glow"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span className={isTamil ? "font-tamil" : ""}>{t('analyzing')}</span>
          </>
        ) : (
          <span className={isTamil ? "font-tamil" : ""}>{t('analyze')}</span>
        )}
      </Button>
    </form>
  );
}
