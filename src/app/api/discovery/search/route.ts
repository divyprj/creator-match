import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function extractUrls(html: string): string[] {
  const urls: string[] = [];
  const regex = /href="([^"]+)"/g;
  let match;
  const reserved = [
    'pricing',
    'login',
    'about',
    'explore',
    'faq',
    'contact',
    'search',
    'terms',
    'privacy',
    'blog',
    'case-studies',
    'resources',
    'find-influencers',
    'kol-directory',
    'influencer-marketing-platform',
    'agency',
    'brand',
    'creator',
    'signup',
  ];

  while ((match = regex.exec(html)) !== null) {
    const rawUrl = match[1];
    try {
      const decodedUrl = decodeURIComponent(rawUrl);
      
      // 1. Extract Qoruz URLs
      if (decodedUrl.includes('qoruz.com')) {
        let qoruzUrl = '';
        if (decodedUrl.includes('uddg=')) {
          const parts = decodedUrl.split('uddg=');
          if (parts.length > 1) {
            const potential = parts[1].split('&')[0];
            if (potential.startsWith('http')) {
              qoruzUrl = potential;
            }
          }
        } else if (decodedUrl.startsWith('http') || decodedUrl.startsWith('https')) {
          qoruzUrl = decodedUrl;
        }

        if (qoruzUrl) {
          const urlObj = new URL(qoruzUrl);
          const path = urlObj.pathname.replace(/^\/|\/$/g, '');
          const segments = path.split('/');
          const handle = segments[0];

          if (handle && !reserved.includes(handle.toLowerCase())) {
            const finalUrl = `https://qoruz.com/${handle}`;
            if (!urls.includes(finalUrl)) {
              urls.push(finalUrl);
            }
          }
        }
      }

      // 2. Extract StarNgage URLs
      if (decodedUrl.includes('starngage.com/app/global/influencer/instagram')) {
        let starngageUrl = '';
        if (decodedUrl.includes('uddg=')) {
          const parts = decodedUrl.split('uddg=');
          if (parts.length > 1) {
            const potential = parts[1].split('&')[0];
            if (potential.startsWith('http')) {
              starngageUrl = potential;
            }
          }
        } else if (decodedUrl.startsWith('http') || decodedUrl.startsWith('https')) {
          starngageUrl = decodedUrl;
        }

        if (starngageUrl) {
          const urlObj = new URL(starngageUrl);
          const path = urlObj.pathname.replace(/^\/|\/$/g, '');
          const segments = path.split('/');
          
          const instagramIdx = segments.indexOf('instagram');
          if (instagramIdx !== -1 && segments[instagramIdx + 1]) {
            const handle = segments[instagramIdx + 1];
            if (handle && !reserved.includes(handle.toLowerCase())) {
              const finalUrl = `https://starngage.com/app/global/influencer/instagram/${handle}`;
              if (!urls.includes(finalUrl)) {
                urls.push(finalUrl);
              }
            }
          }
        }
      }

      // 3. Extract Collabstr URLs
      if (decodedUrl.includes('collabstr.com')) {
        let collabstrUrl = '';
        if (decodedUrl.includes('uddg=')) {
          const parts = decodedUrl.split('uddg=');
          if (parts.length > 1) {
            const potential = parts[1].split('&')[0];
            if (potential.startsWith('http')) {
              collabstrUrl = potential;
            }
          }
        } else if (decodedUrl.startsWith('http') || decodedUrl.startsWith('https')) {
          collabstrUrl = decodedUrl;
        }

        if (collabstrUrl) {
          const urlObj = new URL(collabstrUrl);
          const path = urlObj.pathname.replace(/^\/|\/$/g, '');
          const segments = path.split('/');
          const handle = segments[0];

          if (handle && !reserved.includes(handle.toLowerCase())
              && !handle.startsWith('instagram-influencers')
              && !handle.startsWith('tiktok-influencers')
              && !handle.startsWith('youtube-influencers')) {
            const finalUrl = `https://collabstr.com/${handle}`;
            if (!urls.includes(finalUrl)) {
              urls.push(finalUrl);
            }
          }
        }
      }

    } catch (e) {
      // Ignore invalid URLs
    }
  }
  return urls;
}

const FALLBACK_PROFILES: Record<string, string[]> = {
  fashion: [
    'https://qoruz.com/aarohirawat2270',
    'https://qoruz.com/meetposer',
    'https://qoruz.com/akshaygupta_ak',
    'https://qoruz.com/renu_chandra',
    'https://qoruz.com/ShopDandy',
    'https://qoruz.com/fashionbykaran',
    'https://qoruz.com/stylewithmeghna',
    'https://starngage.com/app/global/influencer/instagram/rohitfashion',
    'https://starngage.com/app/global/influencer/instagram/divya_style',
    'https://starngage.com/app/global/influencer/instagram/thestylecompanion',
    'https://starngage.com/app/global/influencer/instagram/nikitasharma_style',
    'https://starngage.com/app/global/influencer/instagram/aman_fashion_hub',
    'https://collabstr.com/khushi-singh',
    'https://collabstr.com/kalakaaribydhwani',
    'https://collabstr.com/maahi-style',
    'https://collabstr.com/ranjeet-kumar',
    'https://collabstr.com/pooja-fashion',
    'https://collabstr.com/bhavna-lifestyle',
    'https://collabstr.com/anushka-tomar',
    'https://collabstr.com/goswami-ruchi',
    'https://collabstr.com/harshita-rajak',
    'https://collabstr.com/vaishnavi-style',
  ],
  beauty: [
    'https://qoruz.com/kritikakhurana',
    'https://qoruz.com/malvikasitlaniofficial',
    'https://qoruz.com/aashnashroff',
    'https://qoruz.com/aarohirawat2270',
    'https://qoruz.com/shreya.jain',
    'https://qoruz.com/makeupbyankita',
    'https://starngage.com/app/global/influencer/instagram/beautywithriya',
    'https://starngage.com/app/global/influencer/instagram/skincare_deepa',
    'https://starngage.com/app/global/influencer/instagram/nisha_glow',
    'https://starngage.com/app/global/influencer/instagram/glam_up_priya',
    'https://starngage.com/app/global/influencer/instagram/himani_makeup',
    'https://starngage.com/app/global/influencer/instagram/kavya_beauty',
    'https://collabstr.com/megha-skincare',
    'https://collabstr.com/ganiya-beauty',
    'https://collabstr.com/tiasa-ray',
    'https://collabstr.com/anamika-sudheendran',
    'https://collabstr.com/anshika-singh',
    'https://collabstr.com/nandini-kukreti',
    'https://collabstr.com/shruti-sharma',
    'https://collabstr.com/sana-khan-makeup',
    'https://collabstr.com/rakhi-rathiya',
    'https://collabstr.com/sushma-singh',
  ],
  tech: [
    'https://qoruz.com/i_ansh_rathi',
    'https://qoruz.com/technicalguruji',
    'https://qoruz.com/shlokasrivastava',
    'https://qoruz.com/geekyranjit',
    'https://qoruz.com/trakintech',
    'https://qoruz.com/ruhez_amara',
    'https://starngage.com/app/global/influencer/instagram/its_tech_boy',
    'https://starngage.com/app/global/influencer/instagram/techy_rohit',
    'https://starngage.com/app/global/influencer/instagram/gadget_guru',
    'https://starngage.com/app/global/influencer/instagram/dev_tech_show',
    'https://starngage.com/app/global/influencer/instagram/amit_tech_talk',
    'https://starngage.com/app/global/influencer/instagram/varun_gadgets',
    'https://collabstr.com/apnatech',
    'https://collabstr.com/gadget-byte',
    'https://collabstr.com/amar-kumar-tech',
    'https://collabstr.com/aapkatech',
    'https://collabstr.com/android-amaan',
    'https://collabstr.com/tech-burner-india',
    'https://collabstr.com/digital-pratik',
    'https://collabstr.com/smart-gadgets-review',
    'https://collabstr.com/rajiv-tech-review',
    'https://collabstr.com/deepak-tech-tips',
  ],
  food: [
    'https://qoruz.com/ranveer.brar',
    'https://qoruz.com/kabitaskitchen',
    'https://qoruz.com/shivesh_b',
    'https://qoruz.com/hebbars.kitchen',
    'https://qoruz.com/foodie.incarnate',
    'https://qoruz.com/delhifoodguide',
    'https://starngage.com/app/global/influencer/instagram/mumbaifoodie',
    'https://starngage.com/app/global/influencer/instagram/chef_kunalkapur',
    'https://starngage.com/app/global/influencer/instagram/poojadhingra',
    'https://starngage.com/app/global/influencer/instagram/thefoodranger',
    'https://starngage.com/app/global/influencer/instagram/spicy_treats',
    'https://starngage.com/app/global/influencer/instagram/bakers_delight',
    'https://collabstr.com/priyanka-rana',
    'https://collabstr.com/monika-sharma',
    'https://collabstr.com/naman-goyal',
    'https://collabstr.com/san-samayal',
    'https://collabstr.com/arya-akhil',
    'https://collabstr.com/shalini-veggie',
    'https://collabstr.com/praveen-natarajan',
    'https://collabstr.com/manal-miyani',
    'https://collabstr.com/deepa-kitchen',
    'https://collabstr.com/amit-foodie',
  ],
  fitness: [
    'https://qoruz.com/guru_mann',
    'https://qoruz.com/fitmuscletv',
    'https://qoruz.com/yatindersingh',
    'https://qoruz.com/sapnavyasan',
    'https://qoruz.com/suhasbhamre',
    'https://starngage.com/app/global/influencer/instagram/rohit_fit_life',
    'https://starngage.com/app/global/influencer/instagram/fitness_with_raj',
    'https://starngage.com/app/global/influencer/instagram/anjali_fit_goals',
    'https://starngage.com/app/global/influencer/instagram/neha_yoga_wellness',
    'https://starngage.com/app/global/influencer/instagram/vikram_iron_gym',
    'https://starngage.com/app/global/influencer/instagram/shakti_athletics',
    'https://starngage.com/app/global/influencer/instagram/priya_fit_journey',
    'https://collabstr.com/anjali-verma',
    'https://collabstr.com/annie-rawat',
    'https://collabstr.com/jagriti-choudhary',
    'https://collabstr.com/shailee-singh',
    'https://collabstr.com/mrs-pradhayini',
    'https://collabstr.com/priya-fitness',
    'https://collabstr.com/rohit-wellness',
    'https://collabstr.com/neha-yoga-life',
    'https://collabstr.com/vikram-gym',
    'https://collabstr.com/kavita-health',
  ],
  gaming: [
    'https://qoruz.com/mortal_gaming',
    'https://qoruz.com/scout_gaming',
    'https://qoruz.com/dynamo_gaming',
    'https://qoruz.com/carryminati',
    'https://qoruz.com/total_gaming',
    'https://starngage.com/app/global/influencer/instagram/techno_gamerz',
    'https://starngage.com/app/global/influencer/instagram/beastboyshub',
    'https://starngage.com/app/global/influencer/instagram/mythpat',
    'https://starngage.com/app/global/influencer/instagram/gamer_fleet',
    'https://starngage.com/app/global/influencer/instagram/payal_gaming',
    'https://starngage.com/app/global/influencer/instagram/triggered_insaan',
    'https://starngage.com/app/global/influencer/instagram/live_insaan',
    'https://collabstr.com/chaitanya-gaming',
    'https://collabstr.com/arun-karthick',
    'https://collabstr.com/dipender-bishnoi',
    'https://collabstr.com/harshit-tanwar',
    'https://collabstr.com/gaming-with-raj',
    'https://collabstr.com/pixel-play-india',
    'https://collabstr.com/noob-to-pro-gaming',
    'https://collabstr.com/esports-arjun',
    'https://collabstr.com/mobile-gamer-india',
    'https://collabstr.com/clutch-king-gaming',
  ],
  finance: [
    'https://qoruz.com/sharanhegde',
    'https://qoruz.com/rachanaranade',
    'https://qoruz.com/pranjalkamra',
    'https://qoruz.com/warikoo',
    'https://qoruz.com/akshat.shrivastava',
    'https://starngage.com/app/global/influencer/instagram/finology_legal',
    'https://starngage.com/app/global/influencer/instagram/asset_yogi',
    'https://starngage.com/app/global/influencer/instagram/money_control',
    'https://starngage.com/app/global/influencer/instagram/chartered_club',
    'https://starngage.com/app/global/influencer/instagram/market_yogi',
    'https://starngage.com/app/global/influencer/instagram/neha_finance_tips',
    'https://starngage.com/app/global/influencer/instagram/tax_planner_india',
    'https://collabstr.com/finance-with-sharan',
    'https://collabstr.com/money-mentor-india',
    'https://collabstr.com/invest-with-siddharth',
    'https://collabstr.com/rupee-tales',
    'https://collabstr.com/savings-guru-india',
    'https://collabstr.com/stock-savvy-india',
    'https://collabstr.com/mutual-fund-easy',
    'https://collabstr.com/budgeting-with-neha',
    'https://collabstr.com/wealth-wise-india',
    'https://collabstr.com/tax-tips-india',
  ],
  education: [
    'https://qoruz.com/khanacademy',
    'https://qoruz.com/byjus',
    'https://qoruz.com/unacademy',
    'https://qoruz.com/physicswallah',
    'https://starngage.com/app/global/influencer/instagram/veritasium',
    'https://starngage.com/app/global/influencer/instagram/english_learning_india',
    'https://starngage.com/app/global/influencer/instagram/coding_with_harry',
    'https://starngage.com/app/global/influencer/instagram/learn_with_amit',
    'https://starngage.com/app/global/influencer/instagram/upsc_guide',
    'https://starngage.com/app/global/influencer/instagram/gk_daily_india',
    'https://starngage.com/app/global/influencer/instagram/science_explained_hindi',
    'https://starngage.com/app/global/influencer/instagram/math_shortcuts',
    'https://collabstr.com/learn-with-priya',
    'https://collabstr.com/edtech-india',
    'https://collabstr.com/study-smart-india',
    'https://collabstr.com/code-with-rahul',
    'https://collabstr.com/science-guru-india',
    'https://collabstr.com/upsc-prep-daily',
    'https://collabstr.com/english-fluency',
    'https://collabstr.com/math-made-easy',
    'https://collabstr.com/career-coach-india',
    'https://collabstr.com/ias-mentor-india',
  ],
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawNiche = searchParams.get('niche');

  if (!rawNiche) {
    return NextResponse.json({ error: 'Niche query parameter is required' }, { status: 400 });
  }

  const niche = rawNiche.toLowerCase().trim();

  // DuckDuckGo search query targeting Qoruz and StarNgage profiles
  const query = `(site:qoruz.com OR site:starngage.com/app/global/influencer/instagram OR site:collabstr.com) "${niche}" "gmail.com"`;
  
  let foundUrls: string[] = [];
  let isFallbackUsed = false;

  try {
    console.log(`Searching DuckDuckGo Lite for query: ${query}`);
    const response = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: `q=${encodeURIComponent(query)}`,
    });

    if (response.ok) {
      const html = await response.text();
      if (html.includes('anomaly-modal') || html.includes('captcha')) {
        console.warn('DuckDuckGo Lite returned a captcha challenge page. Using curated fallbacks.');
      } else {
        foundUrls = extractUrls(html);
        console.log(`DuckDuckGo Lite search completed. Found ${foundUrls.length} profile URLs.`);
      }
    } else {
      console.warn(`DuckDuckGo Lite returned HTTP error: ${response.status}. Using curated fallbacks.`);
    }
  } catch (error) {
    console.error('Error fetching search results from DuckDuckGo Lite:', error);
  }

  // Use pre-seeded fallback profiles if search returns no results
  if (foundUrls.length === 0) {
    isFallbackUsed = true;
    foundUrls = FALLBACK_PROFILES[niche] || FALLBACK_PROFILES['fashion'];
    console.log(`Using fallback profiles for niche "${niche}":`, foundUrls);
  }

  return NextResponse.json({
    query,
    count: foundUrls.length,
    urls: foundUrls,
    isFallbackUsed,
  });
}
