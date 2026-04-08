// Seed data: worldwide creator listings across all service types
// These populate the directory on first visit so clients see results immediately

export const SEED_CREATORS = [
  // ── US TIER 1 ─────────────────────────────────────────────
  {
    id: 'seed-1',
    name: 'Marcus Chen',
    businessName: 'Elevation Films',
    avatar: '🎬',
    bio: 'Award-winning cinematographer and director specializing in corporate storytelling, brand films, and documentary. 10+ years shooting for Fortune 500 clients. RED and ARRI certified.',
    location: { city: 'Los Angeles', state: 'CA', country: 'US', zip: '90028', regionKey: 'us-tier1' },
    services: [
      {
        serviceId: 'video',
        subtypes: ['Corporate', 'Documentary', 'Music Video', 'Social Media Content'],
        rates: { hourlyShoot: 350, fullDay: 2800, corporateProject: 8500, musicVideoProject: 6000 },
        description: 'Full-service video production from concept to final cut. Includes pre-production planning, on-site direction, and post-production.',
      },
      {
        serviceId: 'drone',
        subtypes: ['Commercial', 'Real Estate', 'Film/TV'],
        rates: { hourlyVideo: 400, fullDay: 2200 },
        description: 'FAA Part 107 certified. Cinema-grade aerial cinematography with DJI Inspire 3 and Mavic 3 Pro.',
      },
    ],
    portfolio: [
      { title: 'Nike Brand Film', description: 'Full brand story campaign, 3-day shoot across LA', serviceId: 'video' },
      { title: 'TechCorp Annual Report', description: 'Corporate documentary showcasing company culture', serviceId: 'video' },
      { title: 'Malibu Estate Aerial', description: '$12M property aerial showcase for Coldwell Banker', serviceId: 'drone' },
    ],
    experience: 'senior', yearsExperience: 12,
    tags: ['Corporate', 'Documentary', 'Drone', 'Brand Film', 'RED Camera', 'ARRI'],
    contact: { email: 'marcus@elevationfilms.co', phone: '(323) 555-0247', website: 'elevationfilms.co', instagram: '@elevationfilms' },
    rating: 4.9, reviewCount: 87, availability: 'available',
  },
  {
    id: 'seed-2',
    name: 'Aria Vasquez',
    businessName: 'Aria Visual Studio',
    avatar: '📷',
    bio: 'Commercial and portrait photographer with a bold, editorial style. Featured in Vogue, Harper\'s Bazaar, and Architectural Digest. Specializing in luxury real estate, fashion, and brand photography.',
    location: { city: 'Miami', state: 'FL', country: 'US', zip: '33101', regionKey: 'us-tier1' },
    services: [
      {
        serviceId: 'photography',
        subtypes: ['Commercial', 'Real Estate', 'Portraits', 'Headshots', 'Product'],
        rates: { hourlyEvent: 400, dayRateCommercial: 3500, realEstatePerListing: 400, headshotsSession: 800, productPerImage: 120 },
        description: 'Editorial-quality photography for brands, real estate, and professionals. Full retouching included.',
      },
    ],
    portfolio: [
      { title: 'South Beach Luxury Condos', description: 'Marketing photography for 40-unit luxury development', serviceId: 'photography' },
      { title: 'Zara Campaign', description: 'Spring/summer lookbook — 200 final images', serviceId: 'photography' },
    ],
    experience: 'senior', yearsExperience: 9,
    tags: ['Commercial', 'Real Estate', 'Fashion', 'Luxury', 'Editorial', 'Headshots'],
    contact: { email: 'aria@ariavisual.com', phone: '(305) 555-0182', website: 'ariavisual.com', instagram: '@ariavisualstudio' },
    rating: 4.9, reviewCount: 64, availability: 'available',
  },
  {
    id: 'seed-3',
    name: 'Jordan Mitchell',
    businessName: 'SoundWave Podcast Co.',
    avatar: '🎙️',
    bio: 'Full-service podcast production studio in NYC. We handle everything from recording in our Midtown studio to editing, mastering, and distribution. Over 200 shows launched.',
    location: { city: 'New York', state: 'NY', country: 'US', zip: '10001', regionKey: 'us-tier1' },
    services: [
      {
        serviceId: 'podcast',
        subtypes: ['Audio Only', 'Video Podcast', 'In-Studio', 'Remote Recording'],
        rates: { basicEditPerEp: 300, fullProductionPerEp: 1400, monthlyRetainer4Eps: 4200, recordingSession: 500, showNotesClipsPerEp: 125 },
        description: 'End-to-end podcast production. Studio recording in NYC, remote recording support, editing, mastering, show notes, and social clips.',
      },
    ],
    portfolio: [
      { title: 'The Growth Playbook', description: 'Top 50 business podcast — full production since launch', serviceId: 'podcast' },
      { title: 'Culture Shift', description: 'Video podcast with 500K+ monthly downloads', serviceId: 'podcast' },
    ],
    experience: 'senior', yearsExperience: 8,
    tags: ['Podcast', 'Audio', 'Video Podcast', 'Studio', 'NYC', 'Monthly Retainer'],
    contact: { email: 'studio@soundwavepod.com', phone: '(212) 555-0319', website: 'soundwavepod.com', instagram: '@soundwavepodco' },
    rating: 4.8, reviewCount: 53, availability: 'available',
  },
  {
    id: 'seed-4',
    name: 'Deja Williams',
    businessName: 'ContentFirst Creative',
    avatar: '📱',
    bio: 'Social media content strategist and creator. We produce scroll-stopping Reels, TikToks, and YouTube content for brands looking to grow. Full brand campaign management available.',
    location: { city: 'Chicago', state: 'IL', country: 'US', zip: '60601', regionKey: 'us-tier1' },
    services: [
      {
        serviceId: 'social',
        subtypes: ['Reels/TikTok', 'YouTube', 'UGC', 'Brand Campaign', 'Monthly Package'],
        rates: { singleReelTikTok: 500, contentDay: 3000, monthlyStandard: 2200, monthlyPremium: 5000, brandCampaignProject: 8000 },
        description: 'Strategy-first content creation. We plan, shoot, edit, and optimize content for maximum engagement across all platforms.',
      },
    ],
    portfolio: [
      { title: 'Glossier Chicago Launch', description: 'Full social campaign — 40 assets, 12M impressions', serviceId: 'social' },
      { title: 'Monthly Content for Allbirds', description: 'Ongoing 25-piece/month package', serviceId: 'social' },
    ],
    experience: 'mid', yearsExperience: 5,
    tags: ['Social Media', 'TikTok', 'Reels', 'UGC', 'Brand Campaign', 'YouTube'],
    contact: { email: 'deja@contentfirst.co', website: 'contentfirst.co', instagram: '@contentfirstcreative' },
    rating: 4.8, reviewCount: 42, availability: 'available',
  },

  // ── US TIER 2 ─────────────────────────────────────────────
  {
    id: 'seed-5',
    name: 'Tyler Nguyen',
    businessName: 'NightHawk Drone',
    avatar: '🚁',
    bio: 'FAA Part 107 licensed aerial cinematography for real estate, events, construction, and commercial projects across DFW. 4K cinema-grade footage.',
    location: { city: 'Dallas', state: 'TX', country: 'US', zip: '75201', regionKey: 'us-tier2' },
    services: [
      {
        serviceId: 'drone',
        subtypes: ['Real Estate', 'Commercial', 'Event', 'Mapping/Survey'],
        rates: { hourlyPhoto: 225, hourlyVideo: 300, halfDay: 700, fullDay: 1300, realEstatePerProperty: 250, mappingPerAcre: 35 },
        description: 'FAA Part 107 certified. DJI Inspire 3 and Mavic 3 Pro. All footage delivered in 4K with color grading included.',
      },
    ],
    portfolio: [
      { title: 'Highland Park Estates', description: 'Aerial tours for 15 luxury listings', serviceId: 'drone' },
      { title: 'AT&T Stadium Event', description: 'Live event aerial coverage', serviceId: 'drone' },
    ],
    experience: 'mid', yearsExperience: 5,
    tags: ['Drone', 'Aerial', 'Real Estate', 'FAA Part 107', 'DFW', 'Construction'],
    contact: { email: 'fly@nighthawkdrone.com', phone: '(972) 555-0408', website: 'nighthawkdrone.com', instagram: '@nighthawkdrone' },
    rating: 4.7, reviewCount: 31, availability: 'available',
  },
  {
    id: 'seed-6',
    name: 'Sam Rivera',
    businessName: 'Frame & Flow Post',
    avatar: '🎛️',
    bio: 'Post-production studio specializing in color grading, motion graphics, and audio mixing for indie films, music videos, and corporate content.',
    location: { city: 'Portland', state: 'OR', country: 'US', zip: '97201', regionKey: 'us-tier2' },
    services: [
      {
        serviceId: 'postProduction',
        subtypes: ['Video Editing', 'Color Grading', 'Motion Graphics', 'Audio Mix/Master'],
        rates: { videoEditingHourly: 70, colorGradingHourly: 110, motionGraphicsHourly: 120, audioMixPerEp: 350, mediumProject: 1200, largeProject: 3500 },
        description: 'DaVinci Resolve certified colorist. After Effects and Cinema 4D for motion graphics. Pro Tools for audio.',
      },
    ],
    portfolio: [
      { title: 'Indie Film Color Grade', description: 'Feature-length color grade — selected for SXSW', serviceId: 'postProduction' },
      { title: 'Nike Motion Package', description: 'Animated graphics package for social campaign', serviceId: 'postProduction' },
    ],
    experience: 'senior', yearsExperience: 10,
    tags: ['Color Grading', 'Motion Graphics', 'DaVinci Resolve', 'Post-Production', 'Audio'],
    contact: { email: 'post@frameandflow.studio', website: 'frameandflow.studio', instagram: '@frameandflow' },
    rating: 4.9, reviewCount: 48, availability: 'available',
  },
  {
    id: 'seed-7',
    name: 'Keisha Thomas',
    businessName: 'Reels & Co.',
    avatar: '📱',
    bio: 'Atlanta-based social media content house creating scroll-stopping content for restaurants, fitness brands, and local businesses. We shoot, edit, and post.',
    location: { city: 'Atlanta', state: 'GA', country: 'US', zip: '30301', regionKey: 'us-tier2' },
    services: [
      {
        serviceId: 'social',
        subtypes: ['Reels/TikTok', 'UGC', 'Monthly Package'],
        rates: { singleReelTikTok: 250, contentDay: 1500, monthlyBasic: 800, monthlyStandard: 1600, ugcPerVideo: 175 },
        description: 'Trend-driven short-form content. We handle concepting, shooting, and editing. Captions and hashtag strategy included.',
      },
      {
        serviceId: 'photography',
        subtypes: ['Commercial', 'Product', 'Event'],
        rates: { hourlyEvent: 175, productPerImage: 50 },
        description: 'Product and lifestyle photography for social media and e-commerce.',
      },
    ],
    portfolio: [
      { title: 'Sweetgreen ATL Launch', description: '30-piece content campaign for 3 new locations', serviceId: 'social' },
      { title: 'FitBody Monthly', description: 'Ongoing 20-piece/month fitness content package', serviceId: 'social' },
    ],
    experience: 'mid', yearsExperience: 4,
    tags: ['Social Media', 'UGC', 'Reels', 'Atlanta', 'Restaurants', 'Fitness'],
    contact: { email: 'create@reelsandco.com', phone: '(404) 555-0512', website: 'reelsandco.com', instagram: '@reelsandco' },
    rating: 4.7, reviewCount: 38, availability: 'available',
  },
  {
    id: 'seed-8',
    name: 'Ryan Cooper',
    businessName: 'Cooper Wedding Films',
    avatar: '🎬',
    bio: 'Cinematic wedding filmmaker based in Nashville. Every love story deserves a film, not just a highlight reel. Serving TN, GA, AL, and destination weddings.',
    location: { city: 'Nashville', state: 'TN', country: 'US', zip: '37201', regionKey: 'us-tier2' },
    services: [
      {
        serviceId: 'video',
        subtypes: ['Wedding', 'Event'],
        rates: { weddingPackage: 4000, halfDay: 800, fullDay: 1500 },
        description: 'Cinematic wedding films. Packages include ceremony + reception coverage, highlight film, and full ceremony edit.',
      },
      {
        serviceId: 'photography',
        subtypes: ['Event'],
        rates: { weddingPackage: 3500, hourlyEvent: 200 },
        description: 'Documentary-style wedding photography. 400+ edited photos delivered in online gallery.',
      },
    ],
    portfolio: [
      { title: 'Belle Meade Plantation Wedding', description: 'Cinematic wedding film — 150K views on Vimeo', serviceId: 'video' },
      { title: 'Cheekwood Estate Wedding', description: 'Full day photo + video coverage', serviceId: 'video' },
    ],
    experience: 'mid', yearsExperience: 6,
    tags: ['Wedding', 'Cinematic', 'Nashville', 'Destination', 'Film'],
    contact: { email: 'ryan@cooperweddingfilms.com', website: 'cooperweddingfilms.com', instagram: '@cooperweddingfilms' },
    rating: 4.9, reviewCount: 73, availability: 'available',
  },

  // ── US TIER 3 ─────────────────────────────────────────────
  {
    id: 'seed-9',
    name: 'Megan Olsen',
    businessName: 'Olsen Photo',
    avatar: '📷',
    bio: 'Boise photographer specializing in real estate, small business branding, and family portraits. Affordable rates with fast turnaround.',
    location: { city: 'Boise', state: 'ID', country: 'US', zip: '83702', regionKey: 'us-tier3' },
    services: [
      {
        serviceId: 'photography',
        subtypes: ['Real Estate', 'Commercial', 'Portraits', 'Headshots'],
        rates: { hourlyEvent: 125, realEstatePerListing: 175, headshotsSession: 250 },
        description: 'Clean, bright photography for real estate agents and small businesses. 24-hour turnaround on real estate.',
      },
    ],
    portfolio: [
      { title: 'Boise Bench Real Estate', description: '50+ listings for local agents', serviceId: 'photography' },
    ],
    experience: 'mid', yearsExperience: 4,
    tags: ['Real Estate', 'Portraits', 'Small Business', 'Boise', 'Affordable'],
    contact: { email: 'megan@olsenphoto.com', website: 'olsenphoto.com', instagram: '@olsenphoto' },
    rating: 4.6, reviewCount: 22, availability: 'available',
  },

  // ── CANADA ────────────────────────────────────────────────
  {
    id: 'seed-10',
    name: 'Liam Tremblay',
    businessName: 'North Light Films',
    avatar: '🎬',
    bio: 'Toronto-based production company creating corporate videos, commercials, and brand content for Canadian and international clients. Bilingual (EN/FR).',
    location: { city: 'Toronto', state: 'ON', country: 'CA', zip: '', regionKey: 'ca-tier1' },
    services: [
      {
        serviceId: 'video',
        subtypes: ['Corporate', 'Social Media Content', 'Event'],
        rates: { hourlyShoot: 250, fullDay: 1800, corporateProject: 6000 },
        description: 'Full-service video production. Rates in CAD. Travel across Ontario included.',
      },
    ],
    portfolio: [
      { title: 'Shopify Brand Film', description: 'Internal culture video for Shopify HQ', serviceId: 'video' },
      { title: 'Toronto Raptors Event', description: 'Fan event highlight reel', serviceId: 'video' },
    ],
    experience: 'senior', yearsExperience: 8,
    tags: ['Corporate', 'Commercial', 'Toronto', 'Bilingual', 'Brand Film'],
    contact: { email: 'liam@northlightfilms.ca', website: 'northlightfilms.ca', instagram: '@northlightfilms' },
    rating: 4.8, reviewCount: 39, availability: 'available',
  },
  {
    id: 'seed-11',
    name: 'Priya Sharma',
    businessName: 'Priya Sharma Photography',
    avatar: '📷',
    bio: 'Vancouver wedding and portrait photographer. Natural light specialist with a warm, timeless editing style. Serving BC and destination weddings worldwide.',
    location: { city: 'Vancouver', state: 'BC', country: 'CA', zip: '', regionKey: 'ca-tier1' },
    services: [
      {
        serviceId: 'photography',
        subtypes: ['Portraits', 'Event', 'Commercial'],
        rates: { hourlyEvent: 300, weddingPackage: 5000, headshotsSession: 400 },
        description: 'Natural light photography with warm, editorial toning. All packages include an online gallery and print rights.',
      },
    ],
    portfolio: [
      { title: 'Stanley Park Elopement', description: 'Intimate elopement in the forest — featured in Junebug Weddings', serviceId: 'photography' },
    ],
    experience: 'mid', yearsExperience: 6,
    tags: ['Wedding', 'Portrait', 'Natural Light', 'Vancouver', 'Destination'],
    contact: { email: 'hello@priyasharma.ca', website: 'priyasharma.ca', instagram: '@priyasharmaphoto' },
    rating: 4.9, reviewCount: 56, availability: 'available',
  },

  // ── UK ────────────────────────────────────────────────────
  {
    id: 'seed-12',
    name: 'James O\'Brien',
    businessName: 'JBOB Films',
    avatar: '🎬',
    bio: 'London-based filmmaker creating branded content, music videos, and corporate films. Clients include Universal Music, BBC, and Unilever.',
    location: { city: 'London', state: '', country: 'UK', zip: '', regionKey: 'uk-tier1' },
    services: [
      {
        serviceId: 'video',
        subtypes: ['Corporate', 'Music Video', 'Social Media Content'],
        rates: { hourlyShoot: 200, fullDay: 1200, corporateProject: 7000, musicVideoProject: 5000 },
        description: 'Cinematic video production for brands and artists. All rates in GBP.',
      },
      {
        serviceId: 'postProduction',
        subtypes: ['Video Editing', 'Color Grading'],
        rates: { videoEditingHourly: 80, colorGradingHourly: 120 },
        description: 'DaVinci Resolve grading. Premiere Pro and Avid editing.',
      },
    ],
    portfolio: [
      { title: 'Unilever Sustainability', description: 'Global sustainability campaign — 5 films across 3 countries', serviceId: 'video' },
      { title: 'Stormzy Music Video', description: 'Full production music video — 8M YouTube views', serviceId: 'video' },
    ],
    experience: 'senior', yearsExperience: 11,
    tags: ['Corporate', 'Music Video', 'London', 'BBC', 'Brand Content'],
    contact: { email: 'james@jbobfilms.co.uk', website: 'jbobfilms.co.uk', instagram: '@jbobfilms' },
    rating: 4.8, reviewCount: 44, availability: 'available',
  },
  {
    id: 'seed-13',
    name: 'Sophie Clarke',
    businessName: 'Clarke Creative Studio',
    avatar: '📷',
    bio: 'Manchester-based commercial photographer and content creator. Clean, modern aesthetic for e-commerce, food, and lifestyle brands.',
    location: { city: 'Manchester', state: '', country: 'UK', zip: '', regionKey: 'uk-tier2' },
    services: [
      {
        serviceId: 'photography',
        subtypes: ['Commercial', 'Product', 'Headshots'],
        rates: { hourlyEvent: 120, dayRateCommercial: 900, productPerImage: 45, headshotsSession: 250 },
        description: 'Studio and location photography. All rates in GBP. Retouching included.',
      },
      {
        serviceId: 'social',
        subtypes: ['Reels/TikTok', 'UGC', 'Monthly Package'],
        rates: { singleReelTikTok: 150, contentDay: 800, monthlyBasic: 500 },
        description: 'Social content creation with a focus on lifestyle and product brands.',
      },
    ],
    portfolio: [
      { title: 'ASOS Product Shoot', description: '500+ product images for online catalog', serviceId: 'photography' },
    ],
    experience: 'mid', yearsExperience: 5,
    tags: ['Product', 'E-commerce', 'Content Creator', 'Manchester', 'Food'],
    contact: { email: 'sophie@clarkecreative.co.uk', website: 'clarkecreative.co.uk', instagram: '@clarkecreativestudio' },
    rating: 4.7, reviewCount: 29, availability: 'available',
  },

  // ── EUROPE ────────────────────────────────────────────────
  {
    id: 'seed-14',
    name: 'Lukas Weber',
    businessName: 'Weber Filmproduktion',
    avatar: '🎬',
    bio: 'Berlin-based filmmaker producing commercials, corporate films, and music videos. Multilingual team (DE/EN/FR). Known for bold visual storytelling.',
    location: { city: 'Berlin', state: '', country: 'DE', zip: '', regionKey: 'eu-de' },
    services: [
      {
        serviceId: 'video',
        subtypes: ['Corporate', 'Music Video', 'Documentary'],
        rates: { hourlyShoot: 150, fullDay: 1000, corporateProject: 5000, musicVideoProject: 3500 },
        description: 'Full production house. All rates in EUR. Travel across Germany and EU included.',
      },
    ],
    portfolio: [
      { title: 'Siemens Future Tech', description: 'Corporate innovation film — screened at CES', serviceId: 'video' },
      { title: 'Berlin Music Scene', description: '3-part documentary series on underground music', serviceId: 'video' },
    ],
    experience: 'senior', yearsExperience: 9,
    tags: ['Corporate', 'Music Video', 'Berlin', 'Documentary', 'Multilingual'],
    contact: { email: 'lukas@weberfilm.de', website: 'weberfilm.de', instagram: '@weberfilmproduktion' },
    rating: 4.8, reviewCount: 36, availability: 'available',
  },
  {
    id: 'seed-15',
    name: 'Camille Dupont',
    businessName: 'Dupont Photo Paris',
    avatar: '📷',
    bio: 'Paris-based fashion and commercial photographer. Clients include Louis Vuitton, Chanel, and Le Monde. Editorial and advertising work.',
    location: { city: 'Paris', state: '', country: 'FR', zip: '', regionKey: 'eu-fr' },
    services: [
      {
        serviceId: 'photography',
        subtypes: ['Commercial', 'Portraits', 'Product'],
        rates: { hourlyEvent: 200, dayRateCommercial: 2500, productPerImage: 100 },
        description: 'Fashion and luxury brand photography. All rates in EUR.',
      },
    ],
    portfolio: [
      { title: 'Chanel SS26 Campaign', description: 'Spring/summer editorial — 80 final images', serviceId: 'photography' },
    ],
    experience: 'senior', yearsExperience: 14,
    tags: ['Fashion', 'Luxury', 'Paris', 'Editorial', 'Advertising'],
    contact: { email: 'camille@dupontphoto.fr', website: 'dupontphoto.fr', instagram: '@dupontphotoparis' },
    rating: 5.0, reviewCount: 52, availability: 'available',
  },
  {
    id: 'seed-16',
    name: 'Erik Lindqvist',
    businessName: 'Nordic Content Studio',
    avatar: '📱',
    bio: 'Stockholm-based content agency creating social media campaigns, brand films, and podcasts for Scandinavian and international brands.',
    location: { city: 'Stockholm', state: '', country: 'SE', zip: '', regionKey: 'eu-scan' },
    services: [
      {
        serviceId: 'social',
        subtypes: ['Brand Campaign', 'Monthly Package', 'YouTube'],
        rates: { monthlyStandard: 1800, brandCampaignProject: 6000, contentDay: 2000 },
        description: 'Full-service content studio. Strategy, production, editing, and analytics. Rates in EUR.',
      },
      {
        serviceId: 'podcast',
        subtypes: ['Audio Only', 'Video Podcast'],
        rates: { fullProductionPerEp: 800, monthlyRetainer4Eps: 2800 },
        description: 'Podcast production for brands and thought leaders. Scandinavian and English language.',
      },
    ],
    portfolio: [
      { title: 'Spotify Nordics Campaign', description: 'Multi-platform content campaign — 6 months', serviceId: 'social' },
      { title: 'IKEA Sustainability Podcast', description: '20-episode branded podcast series', serviceId: 'podcast' },
    ],
    experience: 'mid', yearsExperience: 6,
    tags: ['Social Media', 'Podcast', 'Stockholm', 'Scandinavian', 'Brand Campaign'],
    contact: { email: 'erik@nordiccontent.se', website: 'nordiccontent.se', instagram: '@nordiccontentstudio' },
    rating: 4.7, reviewCount: 25, availability: 'available',
  },
  {
    id: 'seed-17',
    name: 'Isabella Rossi',
    businessName: 'Rossi Visuals',
    avatar: '🎬',
    bio: 'Milan-based video producer and photographer. Fashion, food, and luxury lifestyle content for Italian and international brands.',
    location: { city: 'Milan', state: '', country: 'IT', zip: '', regionKey: 'eu-it' },
    services: [
      {
        serviceId: 'video',
        subtypes: ['Corporate', 'Social Media Content'],
        rates: { hourlyShoot: 130, fullDay: 850, corporateProject: 4000 },
        description: 'Fashion and lifestyle video production. Rates in EUR.',
      },
      {
        serviceId: 'photography',
        subtypes: ['Commercial', 'Product'],
        rates: { dayRateCommercial: 1800, productPerImage: 80 },
        description: 'High-end product and editorial photography for fashion and food.',
      },
    ],
    portfolio: [
      { title: 'Gucci Product Campaign', description: 'Product photography for e-commerce launch', serviceId: 'photography' },
    ],
    experience: 'mid', yearsExperience: 7,
    tags: ['Fashion', 'Food', 'Milan', 'Luxury', 'Italian'],
    contact: { email: 'isabella@rossivisuals.it', website: 'rossivisuals.it', instagram: '@rossivisuals' },
    rating: 4.8, reviewCount: 33, availability: 'available',
  },
  {
    id: 'seed-18',
    name: 'Carlos Mendez',
    businessName: 'Mendez Media',
    avatar: '🚁',
    bio: 'Madrid-based drone and video specialist. Certified EU drone operator. Real estate, tourism, and event aerial coverage across Spain.',
    location: { city: 'Madrid', state: '', country: 'ES', zip: '', regionKey: 'eu-es' },
    services: [
      {
        serviceId: 'drone',
        subtypes: ['Real Estate', 'Event', 'Commercial'],
        rates: { hourlyPhoto: 120, hourlyVideo: 160, halfDay: 450, realEstatePerProperty: 180 },
        description: 'EU-certified drone pilot. DJI Inspire and Mavic platforms. 4K aerial video and photography.',
      },
      {
        serviceId: 'video',
        subtypes: ['Event', 'Corporate'],
        rates: { hourlyShoot: 100, fullDay: 700 },
        description: 'Event and corporate videography. Bilingual (ES/EN).',
      },
    ],
    portfolio: [
      { title: 'Ibiza Resort Aerial', description: 'Tourism promotional video — aerial + ground footage', serviceId: 'drone' },
    ],
    experience: 'mid', yearsExperience: 5,
    tags: ['Drone', 'Aerial', 'Madrid', 'Tourism', 'Real Estate', 'Spain'],
    contact: { email: 'carlos@mendezmedia.es', website: 'mendezmedia.es', instagram: '@mendezmedia' },
    rating: 4.6, reviewCount: 18, availability: 'available',
  },
];

// Initialize localStorage with seed data if empty or stale format
export function initSeedData() {
  try {
    const existing = JSON.parse(localStorage.getItem('creator-directory') || '[]');
    // Check if data is in the new format (has services array) or old format (flat serviceId)
    const isNewFormat = existing.length > 0 && existing[0].services && Array.isArray(existing[0].services);
    if (existing.length === 0 || !isNewFormat) {
      // Keep any user-added listings (non-seed, non-demo), migrate them if possible
      const userListings = existing.filter(l => !l.id.startsWith('seed-') && !l.id.startsWith('demo-'));
      localStorage.setItem('creator-directory', JSON.stringify([...SEED_CREATORS, ...userListings]));
    }
  } catch {
    localStorage.setItem('creator-directory', JSON.stringify(SEED_CREATORS));
  }
}
