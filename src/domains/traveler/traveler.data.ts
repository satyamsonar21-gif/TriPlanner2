export interface TravelerBooking {
  id: string;
  category: 'accommodation' | 'flights' | 'activities' | 'transport' | 'meals' | 'other';
  title: string;
  provider: string;
  location: string;
  dates: string;
  details: string;
  bookingCode: string;
  amount: number;
  currency: string;
  paymentStatus: 'Paid' | 'Pending' | 'Refunded';
  status: 'Confirmed' | 'At Risk' | 'Pending' | 'Completed' | 'Cancelled';
  image: string;
  journeyTitle: string;
  journeyId: string;
  isDisrupted?: boolean;
  disruptionNotice?: string;
}

export interface SavedDestinationItem {
  id: string;
  name: string;
  country: string;
  category: string;
  image: string;
  estimatedBudget: string;
  duration: string;
  savedDate: string;
}

export interface SavedStayItem {
  id: string;
  name: string;
  destination: string;
  rating: number;
  pricePerNight: string;
  image: string;
  category: string;
}

export interface SavedExperienceItem {
  id: string;
  title: string;
  destination: string;
  duration: string;
  price: string;
  image: string;
  style: string;
}

export interface TravelerNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'disruption' | 'booking' | 'payment' | 'recommendation' | 'system';
  isRead: boolean;
  isCritical?: boolean;
  relatedJourneyId?: string;
  actionLabel?: string;
  actionUrl?: string;
}

export interface PaymentTransaction {
  id: string;
  date: string;
  description: string;
  journey: string;
  method: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Refunded';
  receiptUrl?: string;
}

export interface InvoiceItem {
  id: string;
  bookingCode: string;
  title: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Issued';
}

export const MOCK_TRAVELER_PROFILE = {
  name: 'Ananya Sharma',
  role: 'Traveler',
  email: 'ananya.sharma@triplanner.travel',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  membership: 'TripPlanner Premium',
  validUntil: '12 Dec 2025',
  homeCity: 'New Delhi, India',
  currency: 'INR (₹)',
  passportNumber: 'Z5892014',
  preferredStyles: ['Adventure', 'Beaches', 'Food', 'Culture'],
  pace: 'Balanced' as const,
  dietary: 'Vegetarian',
  emergencyContact: {
    name: 'Vikram Sharma',
    phone: '+91 98102 34911',
    relation: 'Brother',
  },
};

export const MOCK_TRAVELER_METRICS = {
  upcomingTripsCount: 2,
  nextTripNote: 'Next: Goa in 5 days',
  confirmedBookingsCount: 8,
  savedPlacesCount: 24,
  totalSpent: '₹1,24,560',
  tripDaysCount: 18,
  countriesCount: 3,
};

export const MOCK_TRAVELER_BOOKINGS: TravelerBooking[] = [
  {
    id: 'bkg_01',
    category: 'accommodation',
    title: 'Seashell Beach Resort & Spa',
    provider: 'Seashell Hospitality North Goa',
    location: 'Candolim Beach, North Goa',
    dates: '12 May – 14 May 2025',
    details: '2 Nights • 2 Adults • Premium Sea Facing Room',
    bookingCode: 'BKNG-78291',
    amount: 24560,
    currency: 'INR',
    paymentStatus: 'Paid',
    status: 'Confirmed',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600',
    journeyTitle: 'Goa Getaway',
    journeyId: 'jrn_goa_01',
  },
  {
    id: 'bkg_02',
    category: 'activities',
    title: 'Baga Reef Coastal Scuba Diving',
    provider: 'Coastal Aqua Adventures',
    location: 'Baga Coastal Waters, North Goa',
    dates: '13 May 2025 • 14:00 – 16:30',
    details: '2 Divers • Boat Transfer + Certified Dive Master Included',
    bookingCode: 'BKNG-78302',
    amount: 4200,
    currency: 'INR',
    paymentStatus: 'Paid',
    status: 'At Risk',
    isDisrupted: true,
    disruptionNotice: 'High waves & 2.8m swell predicted. Living Engine found 2 alternatives.',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=600',
    journeyTitle: 'Goa Getaway',
    journeyId: 'jrn_goa_01',
  },
  {
    id: 'bkg_03',
    category: 'accommodation',
    title: 'The Hosteller Heritage Quinta',
    provider: 'The Hosteller Goa Living',
    location: 'Fontainhas Latin Quarter, Panjim',
    dates: '14 May – 16 May 2025',
    details: '2 Nights • 2 Adults • Private Portuguese Suite',
    bookingCode: 'BKNG-78315',
    amount: 11400,
    currency: 'INR',
    paymentStatus: 'Paid',
    status: 'Confirmed',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600',
    journeyTitle: 'Goa Getaway',
    journeyId: 'jrn_goa_01',
  },
  {
    id: 'bkg_04',
    category: 'flights',
    title: 'IndiGo Flight 6E-204 (DEL → GOI)',
    provider: 'IndiGo Airlines',
    location: 'New Delhi (DEL) to Dabolim (GOI)',
    dates: '12 May 2025 • Dep 07:15 – Arr 09:50',
    details: '2 Passengers • Extra Legroom • Fast Forward',
    bookingCode: 'BKNG-78110',
    amount: 14200,
    currency: 'INR',
    paymentStatus: 'Paid',
    status: 'Confirmed',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=600',
    journeyTitle: 'Goa Getaway',
    journeyId: 'jrn_goa_01',
  },
  {
    id: 'bkg_05',
    category: 'transport',
    title: 'Private Chauffeur Airport Transfer',
    provider: 'Konkan Express Fleet',
    location: 'Dabolim Airport to Candolim Resort',
    dates: '12 May 2025 • Pickup 10:15',
    details: 'Innova Crysta AC • Dedicated Driver • Tolls Included',
    bookingCode: 'BKNG-78280',
    amount: 2200,
    currency: 'INR',
    paymentStatus: 'Paid',
    status: 'Confirmed',
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=600',
    journeyTitle: 'Goa Getaway',
    journeyId: 'jrn_goa_01',
  },
  {
    id: 'bkg_06',
    category: 'activities',
    title: 'Fontainhas Architectural Walking Tour',
    provider: 'Soul Travelling Goa',
    location: 'Old Latin Quarter, Panjim',
    dates: '14 May 2025 • 16:30 – 18:30',
    details: '2 Explorers • Bakeries & Fado Music Stops',
    bookingCode: 'BKNG-78344',
    amount: 1600,
    currency: 'INR',
    paymentStatus: 'Paid',
    status: 'Confirmed',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=600',
    journeyTitle: 'Goa Getaway',
    journeyId: 'jrn_goa_01',
  },
  {
    id: 'bkg_07',
    category: 'meals',
    title: 'Portuguese Table 7-Course Seafood Supper',
    provider: 'Mum’s Kitchen Goa',
    location: 'Panjim Heritage Riverfront',
    dates: '15 May 2025 • Table at 19:30',
    details: '2 Guests • Chef Curated Tasting Menu',
    bookingCode: 'BKNG-78401',
    amount: 4800,
    currency: 'INR',
    paymentStatus: 'Paid',
    status: 'Confirmed',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600',
    journeyTitle: 'Goa Getaway',
    journeyId: 'jrn_goa_01',
  },
  {
    id: 'bkg_08',
    category: 'flights',
    title: 'IndiGo Flight 6E-518 (GOI → DEL)',
    provider: 'IndiGo Airlines',
    location: 'Dabolim (GOI) to New Delhi (DEL)',
    dates: '16 May 2025 • Dep 19:15 – Arr 21:55',
    details: '2 Passengers • Standard Baggage',
    bookingCode: 'BKNG-78500',
    amount: 13800,
    currency: 'INR',
    paymentStatus: 'Pending',
    status: 'Pending',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=600',
    journeyTitle: 'Goa Getaway',
    journeyId: 'jrn_goa_01',
  },
];

export const MOCK_SAVED_DESTINATIONS: SavedDestinationItem[] = [
  {
    id: 'svd_01',
    name: 'Santorini',
    country: 'Greece',
    category: 'Island • Europe',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&q=80&w=600',
    estimatedBudget: '₹1,85,000',
    duration: '6–8 Days',
    savedDate: 'Saved 3 days ago',
  },
  {
    id: 'svd_02',
    name: 'Bali',
    country: 'Indonesia',
    category: 'Island • Asia',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=600',
    estimatedBudget: '₹65,000',
    duration: '7–10 Days',
    savedDate: 'Saved 1 week ago',
  },
  {
    id: 'svd_03',
    name: 'Swiss Alps',
    country: 'Switzerland',
    category: 'Mountains • Europe',
    image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&q=80&w=600',
    estimatedBudget: '₹2,40,000',
    duration: '8–12 Days',
    savedDate: 'Saved 2 weeks ago',
  },
  {
    id: 'svd_04',
    name: 'Agra & Taj Mahal',
    country: 'India',
    category: 'Heritage • India',
    image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=600',
    estimatedBudget: '₹15,000',
    duration: '2–3 Days',
    savedDate: 'Saved last month',
  },
  {
    id: 'svd_05',
    name: 'Kyoto',
    country: 'Japan',
    category: 'Culture • Asia',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=600',
    estimatedBudget: '₹1,95,000',
    duration: '7–9 Days',
    savedDate: 'Saved last month',
  },
  {
    id: 'svd_06',
    name: 'Amalfi Coast',
    country: 'Italy',
    category: 'Coastal • Europe',
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=80&w=600',
    estimatedBudget: '₹2,10,000',
    duration: '6–8 Days',
    savedDate: 'Saved 2 months ago',
  },
];

export const MOCK_NOTIFICATIONS: TravelerNotification[] = [
  {
    id: 'notif_01',
    title: 'Scuba Diving on 13 May is at risk',
    description: 'High waves & swell predicted at Baga Reef. Living Journey Engine found 2 score-matched alternatives.',
    timestamp: '10m ago',
    type: 'disruption',
    isRead: false,
    isCritical: true,
    relatedJourneyId: 'jrn_goa_01',
    actionLabel: 'Review Alternatives',
    actionUrl: '/notifications',
  },
  {
    id: 'notif_02',
    title: 'Your stay at The Hosteller is confirmed',
    description: 'Check-in on 14 May • 2 Adults • Private Portuguese Suite. Digital key ready in living pass.',
    timestamp: '2h ago',
    type: 'booking',
    isRead: false,
    relatedJourneyId: 'jrn_goa_01',
    actionLabel: 'View Voucher',
  },
  {
    id: 'notif_03',
    title: 'Price drop on your return flight',
    description: 'Mumbai → Delhi • 16 May • ₹1,850 less. Upgrade option available with flexible cancellation.',
    timestamp: '1d ago',
    type: 'payment',
    isRead: false,
    relatedJourneyId: 'jrn_goa_01',
    actionLabel: 'Check Price Drop',
  },
  {
    id: 'notif_04',
    title: 'Private Chauffeur assigned for Goa Arrival',
    description: 'Driver Ramesh K. (Innova Crysta AC GA-03-B-4921) confirmed for 12 May airport pickup.',
    timestamp: '2d ago',
    type: 'booking',
    isRead: true,
    relatedJourneyId: 'jrn_goa_01',
  },
  {
    id: 'notif_05',
    title: 'Weather forecast updated for North Goa',
    description: 'Balmy 29°C with clear skies expected throughout your 5-day journey window.',
    timestamp: '3d ago',
    type: 'recommendation',
    isRead: true,
    relatedJourneyId: 'jrn_goa_01',
  },
  {
    id: 'notif_06',
    title: 'Payment receipt issued for Seashell Resort',
    description: '₹24,560 successfully settled via HDFC Visa ending in 4082. Tax invoice ready for download.',
    timestamp: '4d ago',
    type: 'payment',
    isRead: true,
    relatedJourneyId: 'jrn_goa_01',
  },
];

export const MOCK_PAYMENT_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: 'tx_01',
    date: '20 Apr 2026',
    description: 'Seashell Beach Resort & Spa (2 Nights)',
    journey: 'Goa Getaway',
    method: 'HDFC Visa •••• 4082',
    amount: 24560,
    status: 'Paid',
    receiptUrl: '#',
  },
  {
    id: 'tx_02',
    date: '22 Apr 2026',
    description: 'IndiGo Flight DEL → GOI (2 Passengers)',
    journey: 'Goa Getaway',
    method: 'UPI / Google Pay',
    amount: 14200,
    status: 'Paid',
    receiptUrl: '#',
  },
  {
    id: 'tx_03',
    date: '25 Apr 2026',
    description: 'The Hosteller Heritage Suite (2 Nights)',
    journey: 'Goa Getaway',
    method: 'HDFC Visa •••• 4082',
    amount: 11400,
    status: 'Paid',
    receiptUrl: '#',
  },
  {
    id: 'tx_04',
    date: '28 Apr 2026',
    description: 'Baga Reef Coastal Scuba Diving Expedition',
    journey: 'Goa Getaway',
    method: 'HDFC Visa •••• 4082',
    amount: 4200,
    status: 'Paid',
    receiptUrl: '#',
  },
  {
    id: 'tx_05',
    date: '30 Apr 2026',
    description: 'Private Airport Chauffeur Innova Crysta',
    journey: 'Goa Getaway',
    method: 'UPI / Google Pay',
    amount: 2200,
    status: 'Paid',
    receiptUrl: '#',
  },
  {
    id: 'tx_06',
    date: '02 May 2026',
    description: 'IndiGo Flight GOI → DEL (Balance Due)',
    journey: 'Goa Getaway',
    method: 'Scheduled Auto-Debit',
    amount: 6000,
    status: 'Pending',
  },
];
