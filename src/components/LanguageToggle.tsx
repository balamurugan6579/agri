import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-secondary/80 backdrop-blur-sm border border-border/50">
      <button
        onClick={() => setLanguage('en')}
        className={cn(
          'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300',
          language === 'en'
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        {t('english')}
      </button>
      <button
        onClick={() => setLanguage('ta')}
        className={cn(
          'px-4 py-2 rounded-full text-sm font-medium font-tamil transition-all duration-300',
          language === 'ta'
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        {t('tamil')}
      </button>
    </div>
  );
}
