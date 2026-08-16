import { CropRecommendation } from './mockRecommendation';
import { Language } from './constants';

interface ChatResponse {
  message: string;
  suggestions: string[];
}

const responsePatterns = {
  en: {
    why: (rec: CropRecommendation) => ({
      message: `${rec.crop.nameEn} is recommended because your soil has suitable nutrient levels with pH ${rec.estimatedPH}. The current weather conditions (${rec.weather.temperature}°C, ${rec.weather.humidity}% humidity) are ${rec.weatherSuitability === 'suitable' ? 'ideal' : 'acceptable'} for this crop. ${rec.isSuccessInDistrict ? 'This crop is already successfully cultivated in your district.' : 'This crop shows good potential for your region.'}`,
      suggestions: ['What fertilizer should I use?', 'What are the risks?', 'What is the expected price?'],
    }),
    fertilizer: (rec: CropRecommendation) => ({
      message: rec.fertilizerNote.en,
      suggestions: ['Why this crop?', 'What are the risks?', 'When to harvest?'],
    }),
    risk: (rec: CropRecommendation) => ({
      message: rec.riskNote.en,
      suggestions: ['What fertilizer should I use?', 'Why this crop?', 'Water requirements?'],
    }),
    price: (rec: CropRecommendation) => ({
      message: `Based on latest available government data, the estimated current market price is ₹${rec.currentPrice.min} - ₹${rec.currentPrice.max} per quintal. At harvest time (3-6 months), the predicted price range is ₹${rec.harvestPrice.min} - ₹${rec.harvestPrice.max} per quintal. Note: These are estimates and actual prices may vary.`,
      suggestions: ['Why this crop?', 'What are the risks?', 'Soil requirements?'],
    }),
    water: (rec: CropRecommendation) => ({
      message: rec.waterRequirement === 'irrigationRequired' 
        ? `This crop requires assured irrigation. Current rainfall (${rec.weather.rainfall}mm) is insufficient for rainfed cultivation. Ensure proper irrigation infrastructure before planting.`
        : `Current rainfall conditions (${rec.weather.rainfall}mm) may support rainfed cultivation. However, supplemental irrigation during dry spells is recommended for optimal yield.`,
      suggestions: ['What fertilizer should I use?', 'What are the risks?', 'Expected yield?'],
    }),
    soil: (rec: CropRecommendation) => ({
      message: `Your soil analysis shows: pH ${rec.estimatedPH} which is ${rec.soilSuitability === 'suitable' ? 'ideal' : rec.soilSuitability === 'moderate' ? 'acceptable' : 'needs attention'} for ${rec.crop.nameEn}. ${rec.fertilizerNote.en}`,
      suggestions: ['Why this crop?', 'Water requirements?', 'Expected price?'],
    }),
    default: (rec: CropRecommendation) => ({
      message: `I can help you understand the recommendation for ${rec.crop.nameEn}. This crop was selected based on your soil nutrients, local weather conditions, and market potential. What specific aspect would you like to know more about?`,
      suggestions: ['Why this crop?', 'What fertilizer should I use?', 'What are the risks?', 'Expected price?'],
    }),
  },
  ta: {
    why: (rec: CropRecommendation) => ({
      message: `உங்கள் மண்ணில் pH ${rec.estimatedPH} உடன் பொருத்தமான ஊட்டச்சத்து அளவுகள் இருப்பதால் ${rec.crop.nameTa} பரிந்துரைக்கப்படுகிறது. தற்போதைய வானிலை (${rec.weather.temperature}°C, ${rec.weather.humidity}% ஈரப்பதம்) இந்த பயிருக்கு ${rec.weatherSuitability === 'suitable' ? 'சிறந்தது' : 'ஏற்றுக்கொள்ளக்கூடியது'}. ${rec.isSuccessInDistrict ? 'இந்த பயிர் ஏற்கனவே உங்கள் மாவட்டத்தில் வெற்றிகரமாக பயிரிடப்படுகிறது.' : 'இந்த பயிர் உங்கள் பகுதிக்கு நல்ல திறனைக் காட்டுகிறது.'}`,
      suggestions: ['என்ன உரம் பயன்படுத்த வேண்டும்?', 'ஆபத்துகள் என்ன?', 'எதிர்பார்க்கப்படும் விலை?'],
    }),
    fertilizer: (rec: CropRecommendation) => ({
      message: rec.fertilizerNote.ta,
      suggestions: ['ஏன் இந்த பயிர்?', 'ஆபத்துகள் என்ன?', 'எப்போது அறுவடை?'],
    }),
    risk: (rec: CropRecommendation) => ({
      message: rec.riskNote.ta,
      suggestions: ['என்ன உரம் பயன்படுத்த வேண்டும்?', 'ஏன் இந்த பயிர்?', 'நீர் தேவைகள்?'],
    }),
    price: (rec: CropRecommendation) => ({
      message: `சமீபத்திய அரசு தரவுகளின் அடிப்படையில், தற்போதைய மதிப்பிடப்பட்ட சந்தை விலை ₹${rec.currentPrice.min} - ₹${rec.currentPrice.max} குவிண்டால் ஒன்றுக்கு. அறுவடை நேரத்தில் (3-6 மாதங்கள்), கணிக்கப்பட்ட விலை வரம்பு ₹${rec.harvestPrice.min} - ₹${rec.harvestPrice.max} குவிண்டால் ஒன்றுக்கு. குறிப்பு: இவை மதிப்பீடுகள், உண்மையான விலைகள் மாறுபடலாம்.`,
      suggestions: ['ஏன் இந்த பயிர்?', 'ஆபத்துகள் என்ன?', 'மண் தேவைகள்?'],
    }),
    water: (rec: CropRecommendation) => ({
      message: rec.waterRequirement === 'irrigationRequired' 
        ? `இந்த பயிருக்கு உறுதியான பாசனம் தேவை. தற்போதைய மழைப்பொழிவு (${rec.weather.rainfall}மிமீ) மழை நீர் சாகுபடிக்கு போதுமானதல்ல. நடவு செய்வதற்கு முன் சரியான பாசன உள்கட்டமைப்பை உறுதி செய்யவும்.`
        : `தற்போதைய மழை நிலைமைகள் (${rec.weather.rainfall}மிமீ) மழை நீர் சாகுபடியை ஆதரிக்கலாம். இருப்பினும், சிறந்த விளைச்சலுக்கு வறண்ட காலங்களில் கூடுதல் பாசனம் பரிந்துரைக்கப்படுகிறது.`,
      suggestions: ['என்ன உரம் பயன்படுத்த வேண்டும்?', 'ஆபத்துகள் என்ன?', 'எதிர்பார்க்கப்படும் விளைச்சல்?'],
    }),
    soil: (rec: CropRecommendation) => ({
      message: `உங்கள் மண் பகுப்பாய்வு காட்டுகிறது: pH ${rec.estimatedPH} இது ${rec.crop.nameTa} க்கு ${rec.soilSuitability === 'suitable' ? 'சிறந்தது' : rec.soilSuitability === 'moderate' ? 'ஏற்றுக்கொள்ளக்கூடியது' : 'கவனிக்க வேண்டும்'}. ${rec.fertilizerNote.ta}`,
      suggestions: ['ஏன் இந்த பயிர்?', 'நீர் தேவைகள்?', 'எதிர்பார்க்கப்படும் விலை?'],
    }),
    default: (rec: CropRecommendation) => ({
      message: `${rec.crop.nameTa} பரிந்துரையை புரிந்துகொள்ள நான் உங்களுக்கு உதவ முடியும். உங்கள் மண் ஊட்டச்சத்துக்கள், உள்ளூர் வானிலை நிலைமைகள் மற்றும் சந்தை திறன் ஆகியவற்றின் அடிப்படையில் இந்த பயிர் தேர்ந்தெடுக்கப்பட்டது. எந்த குறிப்பிட்ட அம்சத்தைப் பற்றி மேலும் தெரிந்துகொள்ள விரும்புகிறீர்கள்?`,
      suggestions: ['ஏன் இந்த பயிர்?', 'என்ன உரம் பயன்படுத்த வேண்டும்?', 'ஆபத்துகள் என்ன?', 'எதிர்பார்க்கப்படும் விலை?'],
    }),
  },
};

export function getChatbotResponse(
  query: string,
  recommendation: CropRecommendation,
  language: Language
): ChatResponse {
  const patterns = responsePatterns[language];
  const lowerQuery = query.toLowerCase();
  
  // Pattern matching for English
  if (language === 'en') {
    if (lowerQuery.includes('why') || lowerQuery.includes('reason') || lowerQuery.includes('recommend')) {
      return patterns.why(recommendation);
    }
    if (lowerQuery.includes('fertilizer') || lowerQuery.includes('nutrient') || lowerQuery.includes('urea')) {
      return patterns.fertilizer(recommendation);
    }
    if (lowerQuery.includes('risk') || lowerQuery.includes('problem') || lowerQuery.includes('issue') || lowerQuery.includes('danger')) {
      return patterns.risk(recommendation);
    }
    if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('money') || lowerQuery.includes('market')) {
      return patterns.price(recommendation);
    }
    if (lowerQuery.includes('water') || lowerQuery.includes('irrigation') || lowerQuery.includes('rain')) {
      return patterns.water(recommendation);
    }
    if (lowerQuery.includes('soil') || lowerQuery.includes('ph') || lowerQuery.includes('nutrient')) {
      return patterns.soil(recommendation);
    }
  }
  
  // Pattern matching for Tamil
  if (language === 'ta') {
    if (lowerQuery.includes('ஏன்') || lowerQuery.includes('காரணம்') || lowerQuery.includes('பரிந்துரை')) {
      return patterns.why(recommendation);
    }
    if (lowerQuery.includes('உரம்') || lowerQuery.includes('ஊட்டச்சத்து')) {
      return patterns.fertilizer(recommendation);
    }
    if (lowerQuery.includes('ஆபத்து') || lowerQuery.includes('பிரச்சனை') || lowerQuery.includes('ஆபாயம்')) {
      return patterns.risk(recommendation);
    }
    if (lowerQuery.includes('விலை') || lowerQuery.includes('சந்தை') || lowerQuery.includes('பணம்')) {
      return patterns.price(recommendation);
    }
    if (lowerQuery.includes('நீர்') || lowerQuery.includes('பாசனம்') || lowerQuery.includes('மழை')) {
      return patterns.water(recommendation);
    }
    if (lowerQuery.includes('மண்') || lowerQuery.includes('ph')) {
      return patterns.soil(recommendation);
    }
  }
  
  return patterns.default(recommendation);
}
