import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TAMIL_NADU_DISTRICTS } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin } from 'lucide-react';

interface DistrictSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function DistrictSelector({ value, onChange }: DistrictSelectorProps) {
  const { language, t } = useLanguage();

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MapPin className="h-4 w-4 text-primary" />
        {t('selectDistrict')}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full h-12 bg-card border-border/50 hover:border-primary/50 transition-colors">
          <SelectValue placeholder={t('districtPlaceholder')} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {TAMIL_NADU_DISTRICTS.map((district) => (
            <SelectItem 
              key={district.id} 
              value={district.id}
              className="cursor-pointer"
            >
              <span className={language === 'ta' ? 'font-tamil' : ''}>
                {language === 'ta' ? district.nameTa : district.nameEn}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
