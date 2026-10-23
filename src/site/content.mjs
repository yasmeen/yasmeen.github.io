// Everything the site says lives here. Edit this file, then run `npm run build:site` to regenerate the pages.

export const site = {
  name: 'Yasmeen Roumie',
  title: 'Design engineer',
  tagline: "Always building with what's new.",
  location: 'Miami, FL',
  url: 'https://yasmeenroumie.com',
  email: 'yasmeen.roumie@gmail.com',
  github: 'https://github.com/yasmeen',
  linkedin: 'https://bit.ly/yasmeen-linkedin',
  summary: 'HoloLens apps at NASA. AR lenses at Snapchat. NLP at Tinder and Goldman Sachs. Blockchain at Celo. Deep backend engineering at Oscar Health and Hook.',
  year: 2026
};

export const nav = [
  { key: 'home', href: '/', label: 'Home' },
  { key: 'work', href: '/work', label: 'Work', gel: 'gel-blue', icon: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>' },
  { key: 'projects', href: '/projects', label: 'Projects', gel: 'gel-orange', icon: '<path d="m15 12-8.4 8.4a1.5 1.5 0 0 1-3-3L12 9"/><path d="m18 15 4-4"/><path d="m21.5 11.5-1.9-1.9a2 2 0 0 1-.6-1.4V7l-2.3-2.3A6 6 0 0 0 12.5 3H9l.9.8A6.2 6.2 0 0 1 12 8.4V10l2 2h1.2a2 2 0 0 1 1.4.6l1.9 1.9"/>' },
  { key: 'lab', href: '/lab', label: 'Lab', gel: 'gel-purple', icon: '<path d="M10 2v7.5a2 2 0 0 1-.2.9L4.7 20.5a1 1 0 0 0 .9 1.5h12.8a1 1 0 0 0 .9-1.5l-5.1-10.1a2 2 0 0 1-.2-.9V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>' },
  { key: 'about', href: '/about', label: 'About', gel: 'gel-green', icon: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>' }
];

// Work: newest first. Bullets are plain strings. `attach` holds the talks, papers and code that came out of each job.
export const jobs = [
  {
    id: 'hook', co: 'Hook', team: 'Backend engineering', when: '2022 – 2023', short: '2022 – 23', tags: ['Backend', 'Crypto'],
    what: 'Backend engineering for an NFT options protocol.',
    roles: [{ bullets: ['Heavy backend engineering for Hook, an options protocol for NFTs.'] }]
  },
  {
    id: 'oscar', co: 'Oscar Health', team: 'Claims Engineering', when: 'Summer 2020, then 2021 – 2022', short: '2020 – 22', tags: ['Backend'],
    what: 'Backend systems that process health insurance claims.',
    roles: [{ bullets: ['Went deep on backend engineering for the systems that process health insurance claims.'] }]
  },
  {
    id: 'goldman', co: 'Goldman Sachs', team: 'Marquee Content Team', when: 'Summer 2019', short: '2019', tags: ['NLP', 'Machine learning'],
    what: 'NLP that auto-tags financial articles by asset class.',
    roles: [{ bullets: ['Used NLP and multi-label classification to assign asset classes to financial articles automatically.', 'Deployed the model to auto-tag articles on the client-facing content platform.'] }]
  },
  {
    id: 'celo', co: 'Celo', team: 'Open-source blockchain', when: 'Jan – Apr 2019', short: '2019', tags: ['Blockchain', 'Open source'],
    what: 'A Tobin tax in the open-source Celo blockchain.', tileAttach: 'Code',
    roles: [{ bullets: ['Implemented a Tobin tax in the open-source Celo blockchain.'] }],
    attach: [{ kind: 'code', title: 'Tobin tax commits', meta: 'celo-blockchain on GitHub', href: 'https://github.com/celo-org/celo-blockchain/commits?author=yasmeen' }]
  },
  {
    id: 'tinder', co: 'Tinder', team: 'Tinder Science', when: 'Summer 2018', short: '2018', tags: ['NLP', 'Topic modeling'],
    what: 'Topic modeling on messages with Tinder Science.',
    roles: [{ bullets: ['Natural language processing and predictive topic modeling on messages.', 'K-means clustering over weighted word embeddings.', 'Won first place in the summer intern hackathon.'] }]
  },
  {
    id: 'snapchat', co: 'Snapchat', team: 'Camera Platform', when: 'Summer 2017', short: '2017', tags: ['AR', 'Computer vision', 'Lens Studio'],
    what: 'AR lenses with hand and body tracking.', tileAttach: 'Templates',
    roles: [{ bullets: ['Prototyped AR lenses with hand and body tracking in Lens Studio.', 'Created public templates and documentation for developers.', 'Worked with computer vision researchers on experiences that track objects in 3D with machine learning.'] }],
    attach: [
      { kind: 'templates', title: 'Hand tracking template', meta: 'Lens Studio', href: 'https://lensstudio.snapchat.com/templates/object/hand/' },
      { kind: 'templates', title: 'Body tracking template', meta: 'Lens Studio', href: 'https://lensstudio.snapchat.com/templates/object/body/' }
    ]
  },
  {
    id: 'nasa', co: 'NASA', team: 'Two summers', when: '2015 and 2016', short: '2015 – 16', tags: ['HoloLens', 'Mixed reality', 'Unity'],
    what: 'HoloLens apps for tracking launches in 3D.', tileAttach: 'Paper and talk',
    roles: [
      { team: 'Launch Vehicle Integration Team', when: '2016', bullets: ['Built interactive AR experiences for Microsoft HoloLens to view and track simulated spacecraft launches in 3D.', 'Made mixed reality replicas of future spacecraft so teams could explore them virtually and reduce costs.'] },
      { team: 'Systems integration engineering', when: '2015', bullets: ["Built a Confluence platform to organize the team's upcoming mission launches."] }
    ],
    attach: [
      { kind: 'talk', title: 'Rapid prototyping', meta: 'Unity developer conference, 300+ people, 2016' },
      { kind: 'paper', title: 'A Process for Capturing the Art of Systems Engineering', meta: '2016', href: 'https://doi.org/10.1002/j.2334-5837.2016.00236.x' }
    ]
  }
];

export const attachKinds = {
  paper: { label: 'Paper', gel: 'gel-paper', icon: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8M16 17H8"/>' },
  talk: { label: 'Talk', gel: 'gel-talk', icon: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>' },
  templates: { label: 'Templates', gel: 'gel-blue', icon: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>' },
  code: { label: 'Code', gel: 'gel-code', icon: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>' }
};

// Projects: only launched things, and hackathon projects with a known result.
// `art` is the illustration (rendered from the Mini Yaz model), `color` its backdrop.
export const projects = [
  {
    id: 'nycrun', name: 'NYC Run Clubs', when: '2023 – now', home: true,
    what: 'The go-to information hub for the NYC running community.',
    homeWhat: 'The go-to information hub for the NYC running community.',
    tags: ['Web', 'Community'], color: '#E9EE86', art: 'art-run',
    badge: 'Live', live: true, badgeDot: '#2E9B4F', badgeInk: '#1F5B30', cta: 'Visit the site', href: 'https://nycrunclubs.com', yaz: 'cheer'
  },
  {
    id: 'quantum', name: 'QuantumCoupon AI', when: 'Jan 2024', home: true,
    what: "AI-powered sales outreach for Groupon's sales team.",
    homeWhat: "AI sales outreach for Groupon's sales team. Won their Sales Automation Competition.",
    tags: ['AI', 'Sales tools'], color: '#F8D3DD', art: 'art-trophy',
    badge: "Won Groupon's Sales Automation Competition", badgeDot: '#C24D72', badgeInk: '#7E2241', cta: 'See it', href: 'https://groupon-quantum-coupon.vercel.app/', yaz: 'cheer'
  },
  {
    id: 'fizz', name: 'Fizz Filter', when: 'Oct 2016', home: true,
    what: 'Scan a room, then re-theme its walls and furniture in mixed reality. Built on HoloLens the year it shipped to developers.',
    homeWhat: 'Scan a room and re-theme it in mixed reality on HoloLens.',
    tags: ['HoloLens', 'Mixed reality'], color: '#CFE6FF', art: 'art-visor',
    badge: 'Reality Virtually Hackathon', badgeDot: '#2F7FE0', badgeInk: '#0E3F86', cta: 'Watch it', href: 'https://bit.ly/fizz-filter', yaz: 'ooh'
  },
  {
    id: 'pillar', name: 'PillAR', when: 'Sep 2017',
    what: 'Reads pill bottles with computer vision and tracks your medication in AR.',
    tags: ['iOS', 'AR', 'Computer vision'], color: '#CBD1EC', art: 'art-phone',
    badge: '2nd place, PennApps XVI', badgeDot: '#36436F', badgeInk: '#1E2645', cta: 'See it', href: 'https://bit.ly/pill-AR', yaz: 'cheer'
  },
  {
    id: 'mintaro', name: 'Mintaro', when: '2022',
    what: 'Crypto payment links on Solana Pay, built the year it launched.',
    tags: ['Solana Pay', 'Crypto'], color: '#F4E2B8', art: 'art-coin',
    cta: 'Visit the site', href: 'https://mintaro.app', yaz: 'ooh'
  }
];

export const about = {
  bio: [
    "I'm a design engineer based in Miami, FL. I've always gravitated to whatever's newest: HoloLens apps at NASA, AR lenses at Snapchat, NLP at Tinder and Goldman Sachs, the Celo blockchain, and deep backend engineering at Oscar Health and Hook.",
    "Outside of work, I build side projects and go to hackathons to try new tools while they're still new."
  ],
  facts: [
    ['Based in', 'Miami, FL'],
    ['Off hours', 'Code, travel, running, and my pups Truffles and Panini']
  ]
};
