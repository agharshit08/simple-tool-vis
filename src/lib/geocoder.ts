import { getGenerativeModel } from 'firebase/ai';
import { ai } from './firebase';

export interface GeoResult {
  lat: number;
  lng: number;
  resolvedName: string;
  source: 'alias' | 'gemini' | 'nominatim' | 'manual';
}

// Comprehensive historical city alias table
const HISTORICAL_ALIASES: Record<string, { lat: number; lng: number; modern: string }> = {
  'constantinople': { lat: 41.0082, lng: 28.9784, modern: 'Istanbul' },
  'byzantium': { lat: 41.0082, lng: 28.9784, modern: 'Istanbul' },
  'new amsterdam': { lat: 40.7128, lng: -74.0060, modern: 'New York' },
  'nieuw amsterdam': { lat: 40.7128, lng: -74.0060, modern: 'New York' },
  'saigon': { lat: 10.8231, lng: 106.6297, modern: 'Ho Chi Minh City' },
  'peking': { lat: 39.9042, lng: 116.4074, modern: 'Beijing' },
  'leningrad': { lat: 59.9343, lng: 30.3351, modern: 'Saint Petersburg' },
  'petrograd': { lat: 59.9343, lng: 30.3351, modern: 'Saint Petersburg' },
  'st. petersburg': { lat: 59.9343, lng: 30.3351, modern: 'Saint Petersburg' },
  'saint petersburg': { lat: 59.9343, lng: 30.3351, modern: 'Saint Petersburg' },
  'edo': { lat: 35.6762, lng: 139.6503, modern: 'Tokyo' },
  'batavia': { lat: -6.2088, lng: 106.8456, modern: 'Jakarta' },
  'bombay': { lat: 19.0760, lng: 72.8777, modern: 'Mumbai' },
  'calcutta': { lat: 22.5726, lng: 88.3639, modern: 'Kolkata' },
  'madras': { lat: 13.0827, lng: 80.2707, modern: 'Chennai' },
  'ceylon': { lat: 7.8731, lng: 80.7718, modern: 'Sri Lanka' },
  'persepolis': { lat: 29.9353, lng: 52.8911, modern: 'Persepolis (ruins)' },
  'carthage': { lat: 36.8528, lng: 10.3233, modern: 'Tunis area' },
  'rome': { lat: 41.9028, lng: 12.4964, modern: 'Rome' },
  'roma': { lat: 41.9028, lng: 12.4964, modern: 'Rome' },
  'paris': { lat: 48.8566, lng: 2.3522, modern: 'Paris' },
  'london': { lat: 51.5074, lng: -0.1278, modern: 'London' },
  'venice': { lat: 45.4408, lng: 12.3155, modern: 'Venice' },
  'venezia': { lat: 45.4408, lng: 12.3155, modern: 'Venice' },
  'amsterdam': { lat: 52.3676, lng: 4.9041, modern: 'Amsterdam' },
  'antwerp': { lat: 51.2213, lng: 4.4051, modern: 'Antwerp' },
  'anvers': { lat: 51.2213, lng: 4.4051, modern: 'Antwerp' },
  'genoa': { lat: 44.4056, lng: 8.9463, modern: 'Genoa' },
  'genova': { lat: 44.4056, lng: 8.9463, modern: 'Genoa' },
  'lisbon': { lat: 38.7223, lng: -9.1393, modern: 'Lisbon' },
  'lisboa': { lat: 38.7223, lng: -9.1393, modern: 'Lisbon' },
  'seville': { lat: 37.3891, lng: -5.9845, modern: 'Seville' },
  'sevilla': { lat: 37.3891, lng: -5.9845, modern: 'Seville' },
  'hamburg': { lat: 53.5753, lng: 10.0153, modern: 'Hamburg' },
  'florence': { lat: 43.7696, lng: 11.2558, modern: 'Florence' },
  'firenze': { lat: 43.7696, lng: 11.2558, modern: 'Florence' },
  'bruges': { lat: 51.2093, lng: 3.2247, modern: 'Bruges' },
  'bruges (bruges)': { lat: 51.2093, lng: 3.2247, modern: 'Bruges' },
  'alexandria': { lat: 31.2001, lng: 29.9187, modern: 'Alexandria' },
  'cairo': { lat: 30.0444, lng: 31.2357, modern: 'Cairo' },
  'smyrna': { lat: 38.4192, lng: 27.1287, modern: 'İzmir' },
  'aleppo': { lat: 36.2021, lng: 37.1343, modern: 'Aleppo' },
  'damascus': { lat: 33.5138, lng: 36.2765, modern: 'Damascus' },
  'baghdad': { lat: 33.3152, lng: 44.3661, modern: 'Baghdad' },
  'vienna': { lat: 48.2082, lng: 16.3738, modern: 'Vienna' },
  'wien': { lat: 48.2082, lng: 16.3738, modern: 'Vienna' },
  'prague': { lat: 50.0755, lng: 14.4378, modern: 'Prague' },
  'prag': { lat: 50.0755, lng: 14.4378, modern: 'Prague' },
  'warsaw': { lat: 52.2297, lng: 21.0122, modern: 'Warsaw' },
  'varsovia': { lat: 52.2297, lng: 21.0122, modern: 'Warsaw' },
  'moscow': { lat: 55.7558, lng: 37.6176, modern: 'Moscow' },
  'moskva': { lat: 55.7558, lng: 37.6176, modern: 'Moscow' },
  'stockholm': { lat: 59.3293, lng: 18.0686, modern: 'Stockholm' },
  'copenhagen': { lat: 55.6761, lng: 12.5683, modern: 'Copenhagen' },
  'köln': { lat: 50.9333, lng: 6.9500, modern: 'Cologne' },
  'cologne': { lat: 50.9333, lng: 6.9500, modern: 'Cologne' },
  'augsburg': { lat: 48.3705, lng: 10.8978, modern: 'Augsburg' },
  'nuremberg': { lat: 49.4521, lng: 11.0767, modern: 'Nuremberg' },
  'nürnberg': { lat: 49.4521, lng: 11.0767, modern: 'Nuremberg' },
  'frankfurt': { lat: 50.1109, lng: 8.6821, modern: 'Frankfurt' },
};

// Batch AI Geocoding
export async function geocodeCitiesBulk(
  cities: string[],
  year?: number
): Promise<Record<string, GeoResult | null>> {
  if (!cities.length) return {};
  
  const results: Record<string, GeoResult | null> = {};
  
  // 1. Resolve using local aliases first
  const unresolvedCities: string[] = [];
  for (const city of cities) {
    if (!city || !city.trim()) continue;
    const key = city.trim().toLowerCase();
    const alias = HISTORICAL_ALIASES[key];
    if (alias) {
      results[city] = { lat: alias.lat, lng: alias.lng, resolvedName: alias.modern, source: 'alias' };
    } else {
      unresolvedCities.push(city);
    }
  }

  if (unresolvedCities.length === 0) {
    return results;
  }

  // 2. Resolve the rest in bulk with Gemini
  try {
    const model = getGenerativeModel(ai, { model: 'gemini-3.5-flash' });
    const yearContext = year ? ` as they existed around the year ${year}` : '';
    const prompt = `Give me the modern geographic coordinates (latitude and longitude) of the following historical cities or places${yearContext}.
    
Locations to geocode:
${JSON.stringify(unresolvedCities)}

Only respond with a valid JSON object where the keys are the EXACT location names provided above, and the values are objects with "lat", "lng", and "resolvedName".
If you cannot determine a location, omit it from the response.

Example Output format:
{
  "Edo": {"lat": 35.6762, "lng": 139.6503, "resolvedName": "Tokyo"},
  "Smyrna": {"lat": 38.4192, "lng": 27.1287, "resolvedName": "Izmir"}
}`;

    const res = await model.generateContent(prompt);
    const text = res.response.text().trim().replace(/\`\`\`json\n?|\n?\`\`\`/g, '').trim();
    
    try {
      const parsed = JSON.parse(text);
      for (const [cityName, data] of Object.entries(parsed)) {
        const d = data as any;
        if (d && typeof d.lat === 'number' && typeof d.lng === 'number') {
          results[cityName] = {
            lat: d.lat,
            lng: d.lng,
            resolvedName: d.resolvedName || cityName,
            source: 'gemini'
          };
        }
      }
    } catch (parseError) {
      console.warn('Failed to parse Gemini bulk geocoding response:', parseError);
    }
    
  } catch (e) {
    console.warn('Gemini bulk geocoding failed:', e);
  }

  // 3. Fallback to Nominatim for any still unresolved (limited to avoid rate limiting)
  for (const city of unresolvedCities) {
    if (!results[city]) {
      try {
        const encoded = encodeURIComponent(city);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&namedetails=1`,
          { headers: { 'User-Agent': 'Aeterna/1.0' } }
        );
        const data = await res.json();
        if (data.length > 0) {
          results[city] = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            resolvedName: data[0].display_name.split(',')[0],
            source: 'nominatim',
          };
        }
        await new Promise(r => setTimeout(r, 250)); // Nominatim rate limit
      } catch (e) {
        // Ignored
      }
    }
  }

  // Explicitly mark unresolved cities as null so caller knows we attempted them
  for (const city of unresolvedCities) {
    if (results[city] === undefined) {
      results[city] = null;
    }
  }

  return results;
}

