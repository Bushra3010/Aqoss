import {
  Armchair, Baby, Bath, Bell, Briefcase, Car, Church, Coffee, ConciergeBell,
  Dumbbell, Flower2, Utensils, Wifi, Waves, Wind, Zap, Shirt, ShieldCheck,
  Trees, Tv, Users, Cigarette, ArrowUpDown, Sparkles, Martini,
  PlaneTakeoff, ParkingCircle, type LucideIcon,
} from 'lucide-react';

/**
 * Amenities are free text entered in the CRM, so the icon is matched on the
 * name rather than stored. Unmatched amenities fall back to a neutral mark —
 * a hotel can add "Rooftop cinema" without anyone touching this file.
 */
const MATCHERS: [RegExp, LucideIcon][] = [
  [/wi-?fi|internet|lan|network/i, Wifi],
  [/restaurant|dining|kitchen/i, Utensils],
  [/bar|lounge|pub/i, Martini],
  [/breakfast|coffee|tea/i, Coffee],
  [/pool|swim/i, Waves],
  [/spa|massage|sauna/i, Flower2],
  [/gym|fitness/i, Dumbbell],
  [/park/i, ParkingCircle],
  [/airport|shuttle|transfer|cab|taxi/i, PlaneTakeoff],
  [/front desk|reception|concierge/i, ConciergeBell],
  [/room service/i, Bell],
  [/laundry|dry clean/i, Shirt],
  [/business|conference|meeting/i, Briefcase],
  [/garden|lawn|terrace|outdoor/i, Trees],
  [/smoking/i, Cigarette],
  [/power|backup|generator/i, Zap],
  [/housekeep|cleaning/i, Sparkles],
  [/elevator|lift/i, ArrowUpDown],
  [/air ?cond|^ac$|cooling/i, Wind],
  [/tv|television|screen/i, Tv],
  [/bath|tub|shower/i, Bath],
  [/family|child|kid/i, Baby],
  [/car|valet|driver/i, Car],
  [/security|safe|cctv/i, ShieldCheck],
  [/temple|church|worship/i, Church],
  [/seating|sofa|living/i, Armchair],
];

export function amenityIcon(name: string): LucideIcon {
  return MATCHERS.find(([pattern]) => pattern.test(name))?.[1] ?? Users;
}
