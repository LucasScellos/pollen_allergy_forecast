import type { Level, PollenFamily, PollenKey } from './pollen';
import { load, save } from './storage';

export type Lang = 'en' | 'fr';

const en = {
  appName: 'Pollen Forecast',
  tagline: '4-day pollen forecast for anywhere in Europe',
  searchPlaceholder: 'Search a city…',
  searchLabel: 'Search a location',
  useMyLocation: 'Use my location',
  locating: 'Locating…',
  pickOnMap: 'Pick on map',
  closeMap: 'Close map',
  mapHint: 'Click anywhere on the map to see its forecast.',
  recent: 'Recent',
  noResults: 'No place found',
  myLocation: 'My location',
  selectedPoint: 'Selected point',
  loading: 'Loading forecast…',
  retry: 'Retry',
  errorTitle: 'Could not load the forecast',
  errorBody: 'Check your connection and try again.',
  geoError: 'Location access was denied or is unavailable.',
  outOfCoverageTitle: 'Outside forecast coverage',
  outOfCoverageBody:
    'Pollen forecasts from CAMS are only available for Europe. Try a European city.',
  welcomeTitle: 'Where are you today?',
  welcomeBody: 'Search a city or share your location to see the pollen forecast.',
  todayRisk: 'Pollen risk today',
  mainAllergen: 'Main allergen:',
  nothingSignificant: 'No significant pollen in the air.',
  outlook: '4-day outlook',
  allergens: 'Allergens',
  allergensFor: (day: string) => `Daily average for ${day}`,
  peak: 'peak',
  at: 'at',
  hourlyTitle: (name: string) => `${name}, hourly`,
  hourlyCaption:
    'Hourly concentration in grains/m³. Shaded bands show risk levels, which are based on the daily average.',
  showTable: 'Show table',
  showChart: 'Show chart',
  time: 'Time',
  concentration: 'grains/m³',
  level: 'Level',
  adviceTitle: 'What to do',
  today: 'Today',
  tomorrow: 'Tomorrow',
  unit: 'grains/m³',
  offline: 'You are offline. Showing the last saved data.',
  footerData: 'Data: Copernicus Atmosphere Monitoring Service (CAMS) via Open-Meteo.',
  footerDisclaimer:
    'Indicative forecast. It is not medical advice. Ask a health professional about treatment.',
  footerBy: 'A personal project by',
  toggleTheme: 'Toggle dark mode',
  language: 'Language',
  levels: ['None', 'Low', 'Moderate', 'High', 'Very high'] as Record<Level, string>,
  families: { tree: 'Tree', grass: 'Grass', weed: 'Weed' } as Record<PollenFamily, string>,
  pollens: {
    alder_pollen: 'Alder',
    birch_pollen: 'Birch',
    grass_pollen: 'Grasses',
    mugwort_pollen: 'Mugwort',
    olive_pollen: 'Olive',
    ragweed_pollen: 'Ragweed',
  } as Record<PollenKey, string>,
  advice: {
    0: ['Great day to be outdoors.', 'Air out your home freely.'],
    1: [
      'Most people will not notice anything.',
      'If you are very sensitive, keep your treatment at hand.',
    ],
    2: [
      'Air out your home early in the morning or late in the evening.',
      'Wear sunglasses outdoors to protect your eyes.',
      'Take your preventive treatment if your doctor prescribed one.',
    ],
    3: [
      'Keep windows closed during the day.',
      'Shower and change clothes after being outside.',
      'Avoid mowing, gardening and intense outdoor sport.',
      'Dry laundry indoors.',
    ],
    4: [
      'Limit time outdoors, especially in the afternoon.',
      'Keep windows closed and car vents on recirculation.',
      'Rinse your hair and nose after going out.',
      'Contact your doctor if symptoms get worse.',
    ],
  } as Record<Level, string[]>,
};

type Dict = typeof en;

const fr: Dict = {
  appName: 'Prévisions Pollen',
  tagline: 'Prévisions polliniques à 4 jours partout en Europe',
  searchPlaceholder: 'Rechercher une ville…',
  searchLabel: 'Rechercher un lieu',
  useMyLocation: 'Me localiser',
  locating: 'Localisation…',
  pickOnMap: 'Choisir sur la carte',
  closeMap: 'Fermer la carte',
  mapHint: 'Cliquez n’importe où sur la carte pour voir ses prévisions.',
  recent: 'Récents',
  noResults: 'Aucun lieu trouvé',
  myLocation: 'Ma position',
  selectedPoint: 'Point sélectionné',
  loading: 'Chargement des prévisions…',
  retry: 'Réessayer',
  errorTitle: 'Impossible de charger les prévisions',
  errorBody: 'Vérifiez votre connexion et réessayez.',
  geoError: 'L’accès à la position a été refusé ou est indisponible.',
  outOfCoverageTitle: 'Hors de la zone couverte',
  outOfCoverageBody:
    'Les prévisions polliniques CAMS ne couvrent que l’Europe. Essayez une ville européenne.',
  welcomeTitle: 'Où êtes-vous aujourd’hui ?',
  welcomeBody: 'Recherchez une ville ou partagez votre position pour voir les prévisions.',
  todayRisk: 'Risque pollinique aujourd’hui',
  mainAllergen: 'Allergène principal :',
  nothingSignificant: 'Pas de pollen significatif dans l’air.',
  outlook: 'Tendance sur 4 jours',
  allergens: 'Allergènes',
  allergensFor: (day) => `Moyenne journalière, ${day}`,
  peak: 'pic',
  at: 'à',
  hourlyTitle: (name) => `${name}, heure par heure`,
  hourlyCaption:
    'Concentration horaire en grains/m³. Les bandes colorées indiquent les niveaux de risque, calculés sur la moyenne journalière.',
  showTable: 'Voir le tableau',
  showChart: 'Voir le graphique',
  time: 'Heure',
  concentration: 'grains/m³',
  level: 'Niveau',
  adviceTitle: 'Que faire',
  today: 'Aujourd’hui',
  tomorrow: 'Demain',
  unit: 'grains/m³',
  offline: 'Vous êtes hors ligne. Dernières données enregistrées affichées.',
  footerData:
    'Données : Copernicus Atmosphere Monitoring Service (CAMS) via Open-Meteo.',
  footerDisclaimer:
    'Prévision indicative, qui ne remplace pas un avis médical. Consultez un professionnel de santé pour tout traitement.',
  footerBy: 'Un projet personnel de',
  toggleTheme: 'Basculer le mode sombre',
  language: 'Langue',
  levels: ['Nul', 'Faible', 'Modéré', 'Élevé', 'Très élevé'],
  families: { tree: 'Arbre', grass: 'Graminée', weed: 'Herbacée' },
  pollens: {
    alder_pollen: 'Aulne',
    birch_pollen: 'Bouleau',
    grass_pollen: 'Graminées',
    mugwort_pollen: 'Armoise',
    olive_pollen: 'Olivier',
    ragweed_pollen: 'Ambroisie',
  },
  advice: {
    0: ['Belle journée pour sortir.', 'Aérez votre logement sans retenue.'],
    1: [
      'La plupart des personnes ne ressentiront rien.',
      'Si vous êtes très sensible, gardez votre traitement à portée de main.',
    ],
    2: [
      'Aérez tôt le matin ou tard le soir.',
      'Portez des lunettes de soleil à l’extérieur.',
      'Prenez votre traitement préventif s’il vous a été prescrit.',
    ],
    3: [
      'Gardez les fenêtres fermées en journée.',
      'Douchez-vous et changez de vêtements après être sorti.',
      'Évitez la tonte, le jardinage et le sport intense en extérieur.',
      'Faites sécher le linge à l’intérieur.',
    ],
    4: [
      'Limitez le temps passé dehors, surtout l’après-midi.',
      'Fenêtres fermées et ventilation de la voiture en recyclage.',
      'Rincez vos cheveux et votre nez après être sorti.',
      'Consultez votre médecin si les symptômes s’aggravent.',
    ],
  },
};

const dictionaries: Record<Lang, Dict> = { en, fr };

function detectLang(): Lang {
  const stored = load<Lang | null>('lang', null);
  if (stored === 'en' || stored === 'fr') return stored;
  return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

class I18n {
  lang = $state<Lang>(detectLang());
  t = $derived(dictionaries[this.lang]);
  locale = $derived(this.lang === 'fr' ? 'fr-FR' : 'en-GB');

  set(lang: Lang) {
    this.lang = lang;
    save('lang', lang);
    document.documentElement.lang = lang;
  }

  /** "Today", "Tomorrow", or "Fri 3". `date` is "YYYY-MM-DD" (local to the forecast). */
  dayLabel(date: string, index: number, long = false): string {
    if (index === 0) return this.t.today;
    if (index === 1) return this.t.tomorrow;
    // Noon UTC keeps the calendar date stable in every timezone.
    const d = new Date(`${date}T12:00:00Z`);
    return d.toLocaleDateString(this.locale, {
      weekday: long ? 'long' : 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  number(n: number): string {
    return n.toLocaleString(this.locale, { maximumFractionDigits: n < 10 ? 1 : 0 });
  }
}

export const i18n = new I18n();
