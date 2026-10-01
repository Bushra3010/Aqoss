import {
  BadgeCheck,
  BarChart3,
  BedDouble,
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  ClipboardList,
  CreditCard,
  Globe,
  Hotel,
  Images,
  LayoutTemplate,
  Link2,
  MapPin,
  Megaphone,
  MessageSquareReply,
  Palette,
  PhoneCall,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Star,
  Tag,
  Ticket,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { SolutionSlug } from '@/components/platform/nav';

export type SolutionPage = {
  slug: SolutionSlug;
  /** Anchor of the matching card on the home page. */
  anchor: string;
  name: string;
  icon: LucideIcon;
  /** Gradient of the icon tile and accents. */
  tint: string;
  /** Text colour that matches the gradient. */
  accent: string;
  soft: string;
  headline: [string, string];
  intro: string;
  /** Short labels floating around the hero art. */
  chips: [string, string, string];
  features: { icon: LucideIcon; title: string; text: string }[];
  steps: { title: string; text: string }[];
  /** "Inside the panel": what the hotel's team does day to day. */
  panel: { title: string; points: string[] };
  metaDescription: string;
};

/*
 * Every line here describes something the platform really does today — this
 * is a sales page, and a hotel will hold us to it.
 */
export const SOLUTION_PAGES: Record<SolutionSlug, SolutionPage> = {
  'ai-website': {
    slug: 'ai-website',
    anchor: 'website',
    name: 'AI Website',
    icon: Globe,
    tint: 'from-sky-400 to-blue-600',
    accent: 'text-blue-700',
    soft: 'bg-blue-50 text-blue-600',
    headline: ['A hotel website that', 'sells your rooms'],
    intro:
      'Every property gets a fast, mobile-ready website on its own AQOSS address — rooms, photos, location, house rules and reviews, kept up to date from one panel without a developer.',
    chips: ['Live rooms & rates', 'Own subdomain', 'Mobile-first'],
    features: [
      { icon: Link2, title: 'Your own address', text: 'Every hotel is live at its own subdomain, e.g. your-hotel.aqoss.com — or connect your own domain.' },
      { icon: LayoutTemplate, title: 'One-page design', text: 'Overview, rooms, location, rules and reviews on one page, with tabs that follow the reader as they scroll.' },
      { icon: BedDouble, title: 'Live rooms & rates', text: 'Room cards read straight from the booking engine, so prices and availability are never out of date.' },
      { icon: Images, title: 'Photo galleries', text: 'Upload photos for the hotel and each room type; the first photo becomes the cover everywhere.' },
      { icon: MapPin, title: 'Location & nearby', text: 'Address, map and the places nearby that guests ask about, with distance and travel time.' },
      { icon: Palette, title: 'Your colours', text: 'Each website carries its own brand colour, set from the admin panel — no code changes.' },
    ],
    steps: [
      { title: 'We set up your site', text: 'Your hotel, rooms and policies go in once; your website goes live on its AQOSS address.' },
      { title: 'You keep it fresh', text: 'Change photos, rooms, prices and rules from the admin panel — the site updates instantly.' },
      { title: 'Guests book direct', text: 'Visitors search dates on your site and book a room without leaving it.' },
    ],
    panel: {
      title: 'What your team manages',
      points: ['Hotel details, amenities and policies', 'Room types, photos and descriptions', 'Publishing — preview before going live', 'Website status and branding'],
    },
    metaDescription: 'A fast, mobile-ready hotel website on its own address, with live rooms, rates, photos and reviews — managed from one panel.',
  },

  'ai-marketing': {
    slug: 'ai-marketing',
    anchor: 'marketing',
    name: 'AI Marketing',
    icon: Megaphone,
    tint: 'from-violet-400 to-purple-700',
    accent: 'text-purple-700',
    soft: 'bg-violet-50 text-violet-600',
    headline: ['Fill quiet nights with', 'offers guests act on'],
    intro:
      'Run seasonal, early-bird and last-minute offers, hand out coupon codes that are checked at checkout, and keep guests informed with automatic messages — all from the same place you run your hotel.',
    chips: ['Coupon codes', 'Seasonal offers', 'Guest messages'],
    features: [
      { icon: Tag, title: 'Offers that show', text: 'Percentage, flat, seasonal, early-bird and last-minute offers appear on your website and on the AQOSS home page.' },
      { icon: Ticket, title: 'Coupon codes', text: 'Create codes with a discount, a minimum booking value, validity dates and a cap on total and per-guest use.' },
      { icon: SlidersHorizontal, title: 'Aim them precisely', text: 'Limit a coupon to certain hotels or room types — or let it apply everywhere.' },
      { icon: ShieldCheck, title: 'Checked at checkout', text: 'The booking engine validates every code and re-prices the stay, so a coupon can never be bent.' },
      { icon: Bell, title: 'Automatic messages', text: 'Booking confirmations by email, SMS or WhatsApp, plus a reminder before check-in.' },
      { icon: BarChart3, title: 'See what is used', text: 'Track how many times each coupon has been redeemed, and pause one the moment you want it to stop.' },
    ],
    steps: [
      { title: 'Create an offer', text: 'Pick the type, the discount and the dates it runs.' },
      { title: 'Attach a code', text: 'Link a coupon to the offer and set who can use it and how often.' },
      { title: 'Watch bookings come in', text: 'Guests see the offer, apply the code and book — redemptions are counted for you.' },
    ],
    panel: {
      title: 'What your team manages',
      points: ['Offers and coupons, by hotel or platform-wide', 'Pause or delete in a click', 'Message templates per channel', 'Coupon usage and limits'],
    },
    metaDescription: 'Hotel offers and coupon codes that are validated at checkout, plus automatic guest messages by email, SMS or WhatsApp.',
  },

  'ai-sales': {
    slug: 'ai-sales',
    anchor: 'sales',
    name: 'AI Sales',
    icon: TrendingUp,
    tint: 'from-pink-400 to-pink-600',
    accent: 'text-pink-600',
    soft: 'bg-pink-50 text-pink-600',
    headline: ['Never lose a guest', 'who almost booked'],
    intro:
      'Every abandoned booking becomes a lead your team can follow up. Take phone and walk-in bookings at the desk, record payments, and see how the business is doing at a glance.',
    chips: ['Abandoned-booking leads', 'Desk bookings', 'Revenue reports'],
    features: [
      { icon: Users, title: 'Leads from abandoned bookings', text: 'A guest who started a booking but never paid shows up as a lead with their dates, room and contact details.' },
      { icon: ClipboardList, title: 'Follow-up tracking', text: 'Mark each lead contacted or lost and keep notes — converted is set automatically once they pay.' },
      { icon: PhoneCall, title: 'Phone & walk-in bookings', text: 'Staff book through the same engine as the website, so availability and price are always right.' },
      { icon: CalendarRange, title: 'Change a booking', text: 'Move dates, change rooms or party size; the new price is shown live before you save.' },
      { icon: Wallet, title: 'Desk payments', text: 'Record cash, UPI or card taken at the desk and see exactly what each booking still owes.' },
      { icon: BarChart3, title: 'Reports that matter', text: 'Bookings, revenue and occupancy over any period, with the change from the period before.' },
    ],
    steps: [
      { title: 'A guest drops off', text: 'Their unpaid booking is held briefly, then appears in Leads.' },
      { title: 'Your team follows up', text: 'Call or message, log the outcome and keep notes in one place.' },
      { title: 'The booking is won', text: 'Once they pay — online or at the desk — the lead is marked converted.' },
    ],
    panel: {
      title: 'What your team manages',
      points: ['Leads with status and notes', 'New bookings from phone and the desk', 'Payments, balances and refunds', 'Dashboard and reports'],
    },
    metaDescription: 'Turn abandoned bookings into leads, take phone and walk-in bookings, record desk payments and track revenue.',
  },

  'booking-engine': {
    slug: 'booking-engine',
    anchor: 'booking',
    name: 'Booking Engine',
    icon: CalendarCheck,
    tint: 'from-emerald-400 to-green-600',
    accent: 'text-green-700',
    soft: 'bg-emerald-50 text-emerald-600',
    headline: ['Commission-free bookings', 'that never double-sell'],
    intro:
      'Guests see live availability and nightly prices, pay securely online and get an instant confirmation. Every booking — online, by phone or at the desk — goes through the same engine.',
    chips: ['Live availability', 'Secure payments', 'Instant confirmation'],
    features: [
      { icon: CalendarClock, title: 'Live availability', text: 'Inventory is counted per night in the database, which refuses any booking that would oversell a room.' },
      { icon: Receipt, title: 'Nightly pricing', text: 'Set a base price per room type and override it for any date — weekends, festivals, peak season.' },
      { icon: CreditCard, title: 'Secure online payment', text: 'Guests pay through a secure payment gateway; the booking is confirmed the moment payment succeeds.' },
      { icon: RotateCcw, title: 'Refunds & cancellations', text: 'Full or partial refunds, spread across the booking’s payments, with the balance always correct.' },
      { icon: Smartphone, title: 'Mobile-optimized', text: 'Search, pick a room and pay comfortably on a phone — where most guests book.' },
      { icon: UserCheck, title: 'Guest accounts', text: 'Guests sign in to see their bookings, payments and invoices in one place.' },
    ],
    steps: [
      { title: 'Search dates', text: 'The guest picks dates and party size on your website.' },
      { title: 'Choose & pay', text: 'They choose a room at a price checked by the server, and pay securely.' },
      { title: 'Confirmed instantly', text: 'The booking is confirmed, an invoice is issued and the guest is notified.' },
    ],
    panel: {
      title: 'What your team manages',
      points: ['Prices by date and room type', 'Inventory and room blocks', 'Bookings, check-in and check-out', 'Payments and refunds'],
    },
    metaDescription: 'A commission-free hotel booking engine with live availability, nightly pricing, secure payments and instant confirmation.',
  },

  reputation: {
    slug: 'reputation',
    anchor: 'reputation',
    name: 'Reputation Management',
    icon: Star,
    tint: 'from-orange-300 to-orange-500',
    accent: 'text-orange-600',
    soft: 'bg-orange-50 text-orange-600',
    headline: ['Reviews from real guests,', 'answered in your voice'],
    intro:
      'Collect reviews only from guests who really stayed, publish the ones you approve, and reply publicly — the ratings then show on your website for every future guest to see.',
    chips: ['Verified stays', 'Public replies', 'Rating breakdown'],
    features: [
      { icon: BadgeCheck, title: 'Verified reviews', text: 'Only guests with a completed stay can review it, so every review comes from a real booking.' },
      { icon: ShieldCheck, title: 'Moderation', text: 'Approve, hide or remove reviews before they appear on your website.' },
      { icon: MessageSquareReply, title: 'Public replies', text: 'Answer any review from the admin panel; your reply is shown right under it.' },
      { icon: Star, title: 'Rating breakdown', text: 'Guests rate cleanliness, service, location and value as well as the overall stay.' },
      { icon: Hotel, title: 'Shown on your website', text: 'Your average rating and approved reviews appear on your hotel website automatically.' },
      { icon: Search, title: 'Find what matters', text: 'Filter reviews by status to see what is waiting for approval or a reply.' },
    ],
    steps: [
      { title: 'A guest checks out', text: 'Their completed stay can now be reviewed from their account.' },
      { title: 'You moderate & reply', text: 'Approve the review and answer it publicly from the panel.' },
      { title: 'Future guests see it', text: 'The review and your reply go live on your website.' },
    ],
    panel: {
      title: 'What your team manages',
      points: ['New reviews waiting for approval', 'Replies to guests', 'Hidden and removed reviews', 'Average rating per hotel'],
    },
    metaDescription: 'Verified hotel reviews from completed stays, with moderation, public replies and ratings shown on your website.',
  },
};

export const SOLUTION_LIST = Object.values(SOLUTION_PAGES);

