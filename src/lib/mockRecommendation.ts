import { CROPS_DATA, TAMIL_NADU_DISTRICTS } from './constants';
import { PREDICT_URL } from './api';

export interface SoilInput {
  district: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph?: number;
}

export interface CropRecommendation {
  crop: typeof CROPS_DATA[0];
  confidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  weatherSuitability: 'suitable' | 'moderate' | 'needsAttention';
  soilSuitability: 'suitable' | 'moderate' | 'needsAttention';
  currentPrice: { min: number; max: number };
  harvestPrice: { min: number; max: number };
  fertilizerNote: { en: string; ta: string };
  riskNote: { en: string; ta: string };
  isSuccessInDistrict: boolean;
  waterRequirement: 'irrigationRequired' | 'rainfedPossible';
  weather: {
    temperature: number;
    humidity: number;
    rainfall: number;
  };
  estimatedPH: number;
}

// Helper to generate helpers (prices, notes) - extracted from original code
function enrichRecommendation(
  crop: typeof CROPS_DATA[0],
  scoreOrConfidence: number,
  input: SoilInput,
  weather: { temperature: number; humidity: number; rainfall: number },
  estimatedPH: number
): CropRecommendation {

  let confidence = scoreOrConfidence;
  // If input is raw score (from mock), normalize it. If from API (0-100), use as is.
  // We'll assume API returns 0-100.

  const confidenceLevel: 'high' | 'medium' | 'low' =
    confidence >= 80 ? 'high' : confidence >= 65 ? 'medium' : 'low';

  // Determine suitability based on values
  const weatherSuitability: 'suitable' | 'moderate' | 'needsAttention' =
    weather.temperature >= 25 && weather.temperature <= 32 ? 'suitable' :
      weather.temperature >= 22 && weather.temperature <= 35 ? 'moderate' : 'needsAttention';

  const soilSuitability: 'suitable' | 'moderate' | 'needsAttention' =
    estimatedPH >= 6.0 && estimatedPH <= 7.5 ? 'suitable' :
      estimatedPH >= 5.5 && estimatedPH <= 8.0 ? 'moderate' : 'needsAttention';

  // Generate price estimates
  const basePrice = 2000 + Math.random() * 3000;
  const currentPrice = {
    min: Math.round(basePrice * 0.9),
    max: Math.round(basePrice * 1.1),
  };
  const harvestPrice = {
    min: Math.round(basePrice * 1.05),
    max: Math.round(basePrice * 1.25),
  };

  // Generate fertilizer notes
  const fertilizerNotes = generateFertilizerNote(input, crop.id);
  const riskNotes = generateRiskNote(weather, estimatedPH, crop.id);

  return {
    crop,
    confidence,
    confidenceLevel,
    weatherSuitability,
    soilSuitability,
    currentPrice,
    harvestPrice,
    fertilizerNote: fertilizerNotes,
    riskNote: riskNotes,
    isSuccessInDistrict: Math.random() > 0.3, // Mock data
    waterRequirement: weather.rainfall > 30 ? 'rainfedPossible' : 'irrigationRequired',
    weather: {
      temperature: Math.round(weather.temperature),
      humidity: Math.round(weather.humidity),
      rainfall: Math.round(weather.rainfall),
    },
    estimatedPH: Math.round(estimatedPH * 10) / 10,
  };
}

// Original mock logic
function generateMockLogic(input: SoilInput, weather: any, estimatedPH: number): CropRecommendation[] {
  const scoredCrops = CROPS_DATA.map(crop => {
    let score = 0;
    const { nitrogen, phosphorus, potassium } = input;

    // Nitrogen preference
    if (crop.id === 'rice' && nitrogen > 120) score += 20;
    if (crop.id === 'banana' && nitrogen > 180) score += 20;
    if (crop.id === 'sugarcane' && nitrogen > 140) score += 15;
    if (crop.id === 'blackgram' && nitrogen < 80) score += 15;
    if (crop.id === 'groundnut' && nitrogen < 100) score += 15;

    // Phosphorus
    if (crop.id === 'groundnut' && phosphorus > 50) score += 15;
    if (crop.id === 'cotton' && phosphorus > 40) score += 10;

    // Potassium
    if (crop.id === 'banana' && potassium > 200) score += 20;
    if (crop.id === 'coconut' && potassium > 150) score += 15;

    // pH suitability (simplified)
    if (estimatedPH >= 6.0 && estimatedPH <= 7.5) score += 10;

    // Random variations
    score += Math.random() * 30;

    return { crop, score };
  });

  // Sort by score and take top 3
  const topCrops = scoredCrops.sort((a, b) => b.score - a.score).slice(0, 3);
  const maxScore = Math.max(...scoredCrops.map(c => c.score)) || 1;

  return topCrops.map(({ crop, score }) => {
    let confidence = 60 + (score / maxScore) * 35;
    confidence = Math.min(95, Math.round(confidence));
    return enrichRecommendation(crop, confidence, input, weather, estimatedPH);
  });
}

// Main function
export async function generateRecommendation(input: SoilInput): Promise<CropRecommendation[]> {
  // Simulate soil pH estimation if not provided
  const estimatedPH = input.ph || (6.0 + Math.random() * 1.5);

  // Simulated weather data (Mock for now, normally would come from API)
  const weather = {
    temperature: 25 + Math.random() * 10,
    humidity: 60 + Math.random() * 25,
    rainfall: Math.random() * 50,
  };

  try {
    // Try to call the local Python backend
    const response = await fetch(PREDICT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nitrogen: input.nitrogen,
        phosphorus: input.phosphorus,
        potassium: input.potassium,
        ph: estimatedPH,
        temperature: weather.temperature,
        humidity: weather.humidity,
        rainfall: weather.rainfall // Note: this mock rainfall might be low compared to crop needs, effectively randomized
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.recommendations && Array.isArray(data.recommendations)) {
        const recommendations: CropRecommendation[] = [];

        for (const rec of data.recommendations) {
          const cropId = rec.crop.toLowerCase();
          const cropData = CROPS_DATA.find(c => c.id.toLowerCase() === cropId);

          if (cropData) {
            recommendations.push(enrichRecommendation(cropData, rec.confidence, input, weather, estimatedPH));
          }
        }

        if (recommendations.length > 0) {
          return recommendations;
        }
      }
    }
  } catch (error) {
    console.warn("Backend ML service unavailable, falling back to mock logic.", error);
  }

  // Fallback
  return generateMockLogic(input, weather, estimatedPH);
}

function generateFertilizerNote(input: SoilInput, cropId: string): { en: string; ta: string } {
  const notes: { [key: string]: { en: string; ta: string } } = {
    lowN: {
      en: 'Nitrogen supplementation recommended. Apply urea or ammonium sulfate.',
      ta: 'நைட்ரஜன் கூடுதலாக தேவை. யூரியா அல்லது அம்மோனியம் சல்பேட் பயன்படுத்தவும்.',
    },
    lowP: {
      en: 'Phosphorus deficiency detected. Apply DAP or superphosphate.',
      ta: 'பாஸ்பரஸ் குறைபாடு உள்ளது. DAP அல்லது சூப்பர் பாஸ்பேட் பயன்படுத்தவும்.',
    },
    lowK: {
      en: 'Potassium supplementation required. Apply muriate of potash.',
      ta: 'பொட்டாசியம் கூடுதலாக தேவை. மியூரியேட் ஆஃப் பொட்டாஷ் பயன்படுத்தவும்.',
    },
    balanced: {
      en: 'Soil nutrients are well-balanced. Apply balanced NPK fertilizer as maintenance.',
      ta: 'மண் ஊட்டச்சத்துக்கள் சமநிலையில் உள்ளன. பராமரிப்புக்கு சமநிலை NPK உரம் பயன்படுத்தவும்.',
    },
  };

  if (input.nitrogen < 100) return notes.lowN;
  if (input.phosphorus < 30) return notes.lowP;
  if (input.potassium < 100) return notes.lowK;
  return notes.balanced;
}

function generateRiskNote(weather: { temperature: number; humidity: number; rainfall: number }, ph: number, cropId: string): { en: string; ta: string } {
  const risks: { en: string[]; ta: string[] } = { en: [], ta: [] };

  if (weather.rainfall < 20) {
    risks.en.push('Low rainfall expected; irrigation dependency is high');
    risks.ta.push('குறைந்த மழைப்பொழிவு எதிர்பார்க்கப்படுகிறது; பாசன சார்பு அதிகம்');
  }

  if (weather.humidity > 80) {
    risks.en.push('High humidity may increase pest and disease risk');
    risks.ta.push('அதிக ஈரப்பதம் பூச்சி மற்றும் நோய் அபாயத்தை அதிகரிக்கலாம்');
  }

  if (ph < 5.5 || ph > 8.0) {
    risks.en.push('Soil pH outside optimal range; consider soil amendment');
    risks.ta.push('மண் pH உகந்த வரம்பிற்கு வெளியே; மண் திருத்தத்தை பரிசீலிக்கவும்');
  }

  if (risks.en.length === 0) {
    return {
      en: 'No significant risks identified. Conditions are favorable.',
      ta: 'குறிப்பிடத்தக்க ஆபத்துகள் எதுவும் கண்டறியப்படவில்லை. நிலைமைகள் சாதகமாக உள்ளன.',
    };
  }

  return {
    en: risks.en.join('. '),
    ta: risks.ta.join('. '),
  };
}
