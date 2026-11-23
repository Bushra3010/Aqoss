/**
 * The property listing that creates a hotel and its website, step by step.
 * Shared by the CRM pages, the client forms and the server actions, so it holds
 * only plain data — no server imports.
 */

export type PropertyCategory = 'hotel' | 'homestay';

export interface PropertyType {
  key: string;
  label: string;
  category: PropertyCategory;
  description: string;
  image: string;
}

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&h=340&fit=crop&q=70`;

export const PROPERTY_CATEGORIES: { key: PropertyCategory; label: string; description: string }[] = [
  {
    key: 'hotel',
    label: 'Hotel',
    description: 'Accommodation with facilities like dining, meeting rooms and more',
  },
  {
    key: 'homestay',
    label: 'Homestays & Villas',
    description: 'Independent homes, villas and cottages rented out whole or by the room',
  },
];

export const PROPERTY_TYPES: PropertyType[] = [
  {
    key: 'resort',
    label: 'Resort',
    category: 'hotel',
    description: 'A self-contained property with leisure facilities such as pools, spas, dining and recreation.',
    image: photo('1520250497591-112f2f40a3f4'),
  },
  {
    key: 'hotel',
    label: 'Hotel',
    category: 'hotel',
    description: 'Rooms with daily housekeeping, a front desk and services such as dining and room service.',
    image: photo('1595576508898-0ad5c879a061'),
  },
  {
    key: 'guest_house',
    label: 'Guest House',
    category: 'hotel',
    description: 'A small, often family-run property with a few rooms and a personal, home-like welcome.',
    image: photo('1590490360182-c33d57733427'),
  },
  {
    key: 'palace',
    label: 'Palace',
    category: 'hotel',
    description: 'A heritage palace or haveli run as a hotel, with royal architecture and history.',
    image: photo('1615836245337-f5b9b2303f10'),
  },
  {
    key: 'houseboat',
    label: 'Houseboat',
    category: 'hotel',
    description: 'Rooms on a floating boat, typically on backwaters or a lake, often with meals on board.',
    image: photo('1593693397690-362cb9666fc2'),
  },
  {
    key: 'motel',
    label: 'Motel',
    category: 'hotel',
    description: 'A budget-friendly roadside stay with parking close to the rooms, for travellers on the move.',
    image: photo('1517840901100-8179e982acb7'),
  },
  {
    key: 'homestay',
    label: 'Homestay',
    category: 'homestay',
    description: 'Rooms in the host’s own home, with local food and a family welcome.',
    image: photo('1502672260266-1c1ef2d93688'),
  },
  {
    key: 'villa',
    label: 'Villa',
    category: 'homestay',
    description: 'A private, independent house rented out whole, often with a pool or garden.',
    image: photo('1613490493576-7fde63acd811'),
  },
  {
    key: 'cottage',
    label: 'Cottage',
    category: 'homestay',
    description: 'A small standalone house in the hills, woods or countryside.',
    image: photo('1518780664697-55e3ad937233'),
  },
  {
    key: 'apartment',
    label: 'Apartment',
    category: 'homestay',
    description: 'A furnished flat with its own kitchen, rented out whole for short stays.',
    image: photo('1522708323590-d24dbb6b0267'),
  },
  {
    key: 'farm_stay',
    label: 'Farm Stay',
    category: 'homestay',
    description: 'A stay on a working farm or plantation, close to nature.',
    image: photo('1500076656116-558758c991c1'),
  },
];

export function propertyType(key: string | null | undefined): PropertyType | undefined {
  return PROPERTY_TYPES.find((t) => t.key === key);
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export type ListingStepKey =
  | 'basic-info'
  | 'location'
  | 'amenities'
  | 'rooms'
  | 'photos'
  | 'policies'
  | 'finance'
  | 'go-live';

export interface ListingStep {
  key: ListingStepKey;
  label: string;
  /** Needed before the website can go live. */
  required: boolean;
}

export const LISTING_STEPS: ListingStep[] = [
  { key: 'basic-info', label: 'Basic Info', required: true },
  { key: 'location', label: 'Location', required: true },
  { key: 'amenities', label: 'Amenities', required: false },
  { key: 'rooms', label: 'Rooms', required: true },
  { key: 'photos', label: 'Photos', required: true },
  { key: 'policies', label: 'Policies', required: true },
  { key: 'finance', label: 'Finance & Legal', required: false },
  { key: 'go-live', label: 'Go Live', required: false },
];

export function isListingStep(value: unknown): value is ListingStepKey {
  return LISTING_STEPS.some((s) => s.key === value);
}

export function nextStep(key: ListingStepKey): ListingStepKey {
  const index = LISTING_STEPS.findIndex((s) => s.key === key);
  return LISTING_STEPS[Math.min(index + 1, LISTING_STEPS.length - 1)].key;
}

export function previousStep(key: ListingStepKey): ListingStepKey | null {
  const index = LISTING_STEPS.findIndex((s) => s.key === key);
  return index > 0 ? LISTING_STEPS[index - 1].key : null;
}

/** Without a step, the listing opens at the first step still to do. */
export function listingPath(hotelId: string, step?: ListingStepKey): string {
  return step ? `/admin/hotels/${hotelId}/listing?step=${step}` : `/admin/hotels/${hotelId}/listing`;
}

// ---------------------------------------------------------------------------
// Amenities — names are matched to icons on the website by `icons.tsx`
// ---------------------------------------------------------------------------

export const AMENITY_GROUPS: { category: string; label: string; items: string[] }[] = [
  {
    category: 'general',
    label: 'Basic facilities',
    items: ['Free Wi-Fi', 'Parking', 'Air conditioning', 'Power backup', 'Lift', '24-hour front desk', 'Housekeeping', 'Laundry service'],
  },
  {
    category: 'food',
    label: 'Food & drink',
    items: ['Restaurant', 'Room service', 'Breakfast', 'Bar', 'Coffee shop'],
  },
  {
    category: 'wellness',
    label: 'Wellness & leisure',
    items: ['Swimming pool', 'Spa', 'Gym', 'Garden', 'Kids play area'],
  },
  {
    category: 'business',
    label: 'Business & travel',
    items: ['Conference room', 'Business centre', 'Airport shuttle', 'Car rental', 'Travel desk'],
  },
  {
    category: 'safety',
    label: 'Safety & security',
    items: ['CCTV', 'Security guard', 'Fire extinguishers', 'First-aid kit', 'Doctor on call'],
  },
];

export const KNOWN_AMENITIES = AMENITY_GROUPS.flatMap((g) => g.items.map((name) => ({ name, category: g.category })));

// ---------------------------------------------------------------------------
// Policies — the answers are kept in hotels.metadata.listing.policies so the
// form can be filled again; the website reads the text rows they produce.
// ---------------------------------------------------------------------------

export const CANCELLATION_OPTIONS = [
  { value: 'free_24h', label: 'Free cancellation up to 24 hours before check-in' },
  { value: 'free_48h', label: 'Free cancellation up to 48 hours before check-in' },
  { value: 'free_72h', label: 'Free cancellation up to 72 hours before check-in' },
  { value: 'non_refundable', label: 'Non-refundable' },
] as const;

export const SMOKING_OPTIONS = [
  { value: 'none', label: 'Not allowed anywhere' },
  { value: 'outdoor', label: 'Only in designated outdoor areas' },
  { value: 'rooms', label: 'Allowed in smoking rooms' },
] as const;

export interface PolicyAnswers {
  cancellation: (typeof CANCELLATION_OPTIONS)[number]['value'];
  couples: boolean;
  local_id: boolean;
  child_free_age: number;
  extra_bed: boolean;
  pets: boolean;
  smoking: (typeof SMOKING_OPTIONS)[number]['value'];
  other: string;
}

export const DEFAULT_POLICY_ANSWERS: PolicyAnswers = {
  cancellation: 'free_48h',
  couples: true,
  local_id: true,
  child_free_age: 5,
  extra_bed: true,
  pets: false,
  smoking: 'outdoor',
  other: '',
};

export const NEARBY_TYPES = [
  { value: 'airport', label: 'Airport' },
  { value: 'railway', label: 'Railway station' },
  { value: 'bus_stand', label: 'Bus stand' },
  { value: 'attraction', label: 'Attraction' },
  { value: 'hospital', label: 'Hospital' },
] as const;

export const OWNERSHIP_TYPES = [
  { value: 'individual', label: 'Individual / sole proprietor' },
  { value: 'partnership', label: 'Partnership firm' },
  { value: 'llp', label: 'LLP' },
  { value: 'company', label: 'Private / public limited company' },
  { value: 'trust', label: 'Trust or society' },
  { value: 'other', label: 'Other' },
] as const;
