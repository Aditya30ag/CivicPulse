export interface MockReport {
  id: string;
  title: string;
  description: string;
  category: 'Pothole' | 'Water Leakage' | 'Streetlight' | 'Garbage' | 'Other';
  status: 'reported' | 'community_verified' | 'in_progress' | 'resolved';
  severityScore: number;
  geoPoint: {
    lat: number;
    lng: number;
  };
  address: string;
  department: string;
  mediaURL: string;
  mediaType?: 'image' | 'video';
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  upvotes: number;
  verifiedBy?: string[];
}

const nowSeconds = Math.floor(Date.now() / 1000);

export const DUMMY_REPORTS: MockReport[] = [
  {
    id: 'cp-101',
    title: 'Severe water main fracture flooding junction',
    description:
      'High-pressure municipal potable pipe burst early this morning near the transit metro gate. Water depth is over 8 inches and rising towards the pedestrian walkway.',
    category: 'Water Leakage',
    status: 'reported',
    severityScore: 9,
    geoPoint: { lat: 28.6145, lng: 77.2085 },
    address: 'Connaught Place Outer Circle, Block C',
    department: 'Water & Sewerage Board',
    mediaURL: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    createdAt: { seconds: nowSeconds - 14 * 60, nanoseconds: 0 },
    upvotes: 46,
    verifiedBy: ['Aarav Sharma', 'Meera Iyer', 'Rohan Patel'],
  },
  {
    id: 'cp-102',
    title: 'Hazardous deep asphalt crater across left traffic lane',
    description:
      'Subsurface sinkhole depression spanning roughly 1.5 meters wide right at the intersection approach. Two two-wheelers already damaged their rims.',
    category: 'Pothole',
    status: 'in_progress',
    severityScore: 8,
    geoPoint: { lat: 28.6295, lng: 77.2185 },
    address: 'Barakhamba Road, Sector 12 Intersection',
    department: 'Public Works — Roads',
    mediaURL: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    createdAt: { seconds: nowSeconds - 45 * 60, nanoseconds: 0 },
    upvotes: 38,
    verifiedBy: ['Kunal Kapoor', 'Sanjay Verma'],
  },
  {
    id: 'cp-103',
    title: 'Complete flyover underpass lighting blackout',
    description:
      'Cluster of 8 high-mast LED fixtures unresponsive since yesterday twilight. The entire blind curve is completely unlit, creating severe collision risk.',
    category: 'Streetlight',
    status: 'reported',
    severityScore: 7,
    geoPoint: { lat: 28.6012, lng: 77.2255 },
    address: 'Lodhi Road Underpass, East Ramp',
    department: 'Electricity Board',
    mediaURL: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
    createdAt: { seconds: nowSeconds - 80 * 60, nanoseconds: 0 },
    upvotes: 29,
    verifiedBy: ['Devika Rao'],
  },
  {
    id: 'cp-104',
    title: 'Overflowing commercial waste obstructing sidewalk',
    description:
      'Unsegregated market trash piled 2 meters high outside the food bazaar entrance. Stray animals scattering plastic into storm drains.',
    category: 'Garbage',
    status: 'resolved',
    severityScore: 6,
    geoPoint: { lat: 28.635, lng: 77.201 },
    address: 'Gole Market Square, Gate 4',
    department: 'Sanitation Department',
    mediaURL: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
    createdAt: { seconds: nowSeconds - 160 * 60, nanoseconds: 0 },
    upvotes: 52,
    verifiedBy: ['Pooja Nair', 'Harish Chandra', 'Zoya Khan'],
  },
  {
    id: 'cp-105',
    title: 'Exposed live feeder terminal box with missing hatch',
    description:
      'Low-hanging 440V distribution box left exposed after windstorm. Wires exposed right next to bus stop queue line within reach of children.',
    category: 'Other',
    status: 'community_verified',
    severityScore: 9,
    geoPoint: { lat: 28.621, lng: 77.195 },
    address: 'Mandir Marg, Near St. Columba Gate',
    department: 'Electricity Board',
    mediaURL: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80',
    createdAt: { seconds: nowSeconds - 240 * 60, nanoseconds: 0 },
    upvotes: 64,
    verifiedBy: ['Dr. V. Raman', 'Sunil Ghosh', 'Tanya Mehra'],
  },
  {
    id: 'cp-106',
    title: 'Storm drain culvert collapsed blocking cycle track',
    description:
      'Concrete slab over the arterial drain has fractured in half. Cyclists and pedestrians must veer into fast oncoming vehicle lanes.',
    category: 'Pothole',
    status: 'in_progress',
    severityScore: 6,
    geoPoint: { lat: 28.591, lng: 77.214 },
    address: 'Jawaharlal Nehru Stadium Western Access',
    department: 'Public Works — Roads',
    mediaURL: 'https://images.unsplash.com/photo-1584463699039-444cb3f9cfb6?auto=format&fit=crop&w=800&q=80',
    createdAt: { seconds: nowSeconds - 360 * 60, nanoseconds: 0 },
    upvotes: 21,
    verifiedBy: ['Arun Joshi'],
  },
  {
    id: 'cp-107',
    title: 'Contaminated muddy backflow in residential water tap',
    description:
      'Over 40 households on Sector 8 block experiencing rust-colored silt in supply line. Suspected cross-contamination with parallel stormwater conduit.',
    category: 'Water Leakage',
    status: 'community_verified',
    severityScore: 8,
    geoPoint: { lat: 28.583, lng: 77.238 },
    address: 'Defence Colony, Block D Enclave',
    department: 'Water & Sewerage Board',
    mediaURL: 'https://images.unsplash.com/photo-1527066579998-dbbae57f45ce?auto=format&fit=crop&w=800&q=80',
    createdAt: { seconds: nowSeconds - 520 * 60, nanoseconds: 0 },
    upvotes: 75,
    verifiedBy: ['Neha Gupta', 'Col. R. K. Bhasin', 'Simran Dhillon'],
  },
  {
    id: 'cp-108',
    title: 'Non-functioning traffic signal at 4-way arterial crossing',
    description:
      'Amber blinking cycle frozen since 8:00 AM. Massive vehicular gridlock with vehicles blocking the intersection in all directions.',
    category: 'Streetlight',
    status: 'in_progress',
    severityScore: 7,
    geoPoint: { lat: 28.641, lng: 77.228 },
    address: 'ITO Junction, Bahadur Shah Zafar Marg',
    department: 'Electricity Board',
    mediaURL: 'https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=800&q=80',
    createdAt: { seconds: nowSeconds - 700 * 60, nanoseconds: 0 },
    upvotes: 89,
    verifiedBy: ['Vikas Swarup', 'Anand Kulkarni'],
  },
  {
    id: 'cp-109',
    title: 'Fallen bough crushing community park boundary railings',
    description:
      'Heavy aged neem tree branch fell during high gusts, smashing 15 feet of metal safety fence and blocking the senior citizens walking path.',
    category: 'Other',
    status: 'resolved',
    severityScore: 5,
    geoPoint: { lat: 28.599, lng: 77.199 },
    address: 'Nehru Park, Chanakyapuri Gate 3',
    department: 'General Services',
    mediaURL: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
    createdAt: { seconds: nowSeconds - 920 * 60, nanoseconds: 0 },
    upvotes: 33,
    verifiedBy: ['Shreya Sen', 'Nikhil Bajaj'],
  },
  {
    id: 'cp-110',
    title: 'Illegal biomedical waste dumped beside school sports field',
    description:
      'Multiple plastic sacks containing discarded syringes and pharmaceutical vials dumped on the open curb. Urgent hazmat disposal required.',
    category: 'Garbage',
    status: 'reported',
    severityScore: 9,
    geoPoint: { lat: 28.648, lng: 77.212 },
    address: 'Pusa Road, Adjacent to Senior Secondary Wing',
    department: 'Sanitation Department',
    mediaURL: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
    createdAt: { seconds: nowSeconds - 1100 * 60, nanoseconds: 0 },
    upvotes: 94,
    verifiedBy: ['Principal M. K. Roy', 'Geeta Singhal', 'Aditya Sen'],
  },
  {
    id: 'cp-111',
    title: 'Series of damaged pedestrian tactile paving tiles',
    description:
      'Tactile guide tiles for visually impaired commuters are broken and dislodged along a 50-meter corridor leading to metro exit.',
    category: 'Pothole',
    status: 'resolved',
    severityScore: 4,
    geoPoint: { lat: 28.625, lng: 77.219 },
    address: 'Janpath Metro Station Gate 2 Forecourt',
    department: 'Public Works — Roads',
    mediaURL: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156a?auto=format&fit=crop&w=800&q=80',
    createdAt: { seconds: nowSeconds - 1400 * 60, nanoseconds: 0 },
    upvotes: 18,
    verifiedBy: ['Deepak Ahuja'],
  },
  {
    id: 'cp-112',
    title: 'Submerged sewage chamber overflowing into alley',
    description:
      'Blocked main municipal sewage chamber spilling foul wastewater across neighborhood alleyway. Residents unable to leave doorways.',
    category: 'Water Leakage',
    status: 'in_progress',
    severityScore: 8,
    geoPoint: { lat: 28.653, lng: 77.234 },
    address: 'Old Delhi Railway Station Approach Road',
    department: 'Water & Sewerage Board',
    mediaURL: 'https://images.unsplash.com/photo-1584463699039-444cb3f9cfb6?auto=format&fit=crop&w=800&q=80',
    createdAt: { seconds: nowSeconds - 1800 * 60, nanoseconds: 0 },
    upvotes: 67,
    verifiedBy: ['Mohd. Tariq', 'Irfan Habib', 'Salma Khatun'],
  },
];



export interface MockLeader {
  id: string;
  name: string;
  photoURL: string;
  points: number;
  trustScore: number;
  ward: string;
  badge: string;
  reportsCount: number;
  verificationsCount: number;
}

export const MOCK_LEADERS: MockLeader[] = [
  {
    id: 'user-01',
    name: 'Aditi Deshmukh',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    points: 1420,
    trustScore: 99,
    ward: 'Ward 41 · South Zone',
    badge: 'CHIEF CIVIC GUARDIAN',
    reportsCount: 38,
    verificationsCount: 94,
  },
  {
    id: 'user-02',
    name: 'Rajeev Singhania',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    points: 1280,
    trustScore: 97,
    ward: 'Ward 12 · Central Corridor',
    badge: 'INFRASTRUCTURE LEAD',
    reportsCount: 31,
    verificationsCount: 82,
  },
  {
    id: 'user-03',
    name: 'Vikram Menon',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    points: 1140,
    trustScore: 96,
    ward: 'Ward 18 · Civil Lines',
    badge: 'COMMUNITY SENTINEL',
    reportsCount: 26,
    verificationsCount: 75,
  },
  {
    id: 'user-04',
    name: 'Sumantha Banerjee',
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    points: 980,
    trustScore: 94,
    ward: 'Ward 07 · Connaught Ward',
    badge: 'DATA AUDITOR',
    reportsCount: 22,
    verificationsCount: 63,
  },
  {
    id: 'user-05',
    name: 'Dr. Vivek Raman',
    photoURL: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
    points: 890,
    trustScore: 98,
    ward: 'Ward 24 · Defence Colony',
    badge: 'PUBLIC SAFETY FELLOW',
    reportsCount: 19,
    verificationsCount: 58,
  },
  {
    id: 'user-06',
    name: 'Pooja Nair',
    photoURL: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    points: 760,
    trustScore: 92,
    ward: 'Ward 15 · Karol Bagh',
    badge: 'ENVIRONMENT CHAMPION',
    reportsCount: 17,
    verificationsCount: 49,
  },
  {
    id: 'user-07',
    name: 'Kunal Kapoor',
    photoURL: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80',
    points: 680,
    trustScore: 91,
    ward: 'Ward 33 · Hauz Khas',
    badge: 'TRANSIT VERIFIER',
    reportsCount: 14,
    verificationsCount: 44,
  },
  {
    id: 'user-08',
    name: 'Tanya Mehra',
    photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    points: 590,
    trustScore: 93,
    ward: 'Ward 09 · Lodhi Estate',
    badge: 'CIVIC ADVOCATE',
    reportsCount: 12,
    verificationsCount: 39,
  },
];