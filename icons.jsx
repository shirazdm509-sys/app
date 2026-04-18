// Icons.jsx — Minimal stroke icons for the Dastgheib app
// All 24x24 viewBox, use stroke="currentColor"

const Icon = ({ d, size = 22, stroke = 1.6, fill, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
    {...rest}>
    {d && <path d={d} />}
    {children}
  </svg>
);

const IconHome = (p) => <Icon {...p}><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V9.5"/></Icon>;
const IconBook = (p) => <Icon {...p}><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z"/><path d="M4 19a2 2 0 012-2h13"/></Icon>;
const IconMedia = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none"/></Icon>;
const IconMic = (p) => <Icon {...p}><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></Icon>;
const IconQuestion = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 115 0c0 1.5-2.5 2-2.5 3.5M12 17h.01"/></Icon>;
const IconSearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></Icon>;
const IconBell = (p) => <Icon {...p}><path d="M6 8a6 6 0 0112 0c0 5 2 6 2 7H4c0-1 2-2 2-7z"/><path d="M10 19a2 2 0 004 0"/></Icon>;
const IconBookmark = (p) => <Icon {...p}><path d="M6 3h12v18l-6-4-6 4V3z"/></Icon>;
const IconNote = (p) => <Icon {...p}><path d="M4 4h12l4 4v12H4V4z"/><path d="M16 4v4h4M8 13h8M8 17h6"/></Icon>;
const IconList = (p) => <Icon {...p}><path d="M3 6h18M3 12h18M3 18h18"/></Icon>;
const IconGrid = (p) => <Icon {...p}><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></Icon>;
const IconPlay = (p) => <Icon {...p}><path d="M6 4l14 8-14 8V4z" fill="currentColor"/></Icon>;
const IconPause = (p) => <Icon {...p}><rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/></Icon>;
const IconArrowLeft = (p) => <Icon {...p}><path d="M19 12H5M11 6l-6 6 6 6"/></Icon>;
const IconArrowRight = (p) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Icon>;
const IconChevronLeft = (p) => <Icon {...p}><path d="M15 6l-6 6 6 6"/></Icon>;
const IconChevronRight = (p) => <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>;
const IconChevronDown = (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>;
const IconClose = (p) => <Icon {...p}><path d="M18 6L6 18M6 6l12 12"/></Icon>;
const IconSettings = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></Icon>;
const IconShare = (p) => <Icon {...p}><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 10.5l7-3M8.5 13.5l7 3"/></Icon>;
const IconDownload = (p) => <Icon {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></Icon>;
const IconFolder = (p) => <Icon {...p}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></Icon>;
const IconImage = (p) => <Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 15l-5-5-8 8"/></Icon>;
const IconHeadphones = (p) => <Icon {...p}><path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="3" y="14" width="5" height="7" rx="2"/><rect x="16" y="14" width="5" height="7" rx="2"/></Icon>;
const IconCalendar = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></Icon>;
const IconType = (p) => <Icon {...p}><path d="M5 7V5h14v2M12 5v14M9 19h6"/></Icon>;
const IconDots = (p) => <Icon {...p}><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/></Icon>;
const IconUser = (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></Icon>;
const IconLogin = (p) => <Icon {...p}><path d="M10 17l-5-5 5-5M5 12h13M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/></Icon>;
const IconNews = (p) => <Icon {...p}><rect x="3" y="4" width="15" height="16" rx="2"/><path d="M18 8h3v10a2 2 0 01-2 2h0M7 8h7M7 12h7M7 16h5"/></Icon>;
const IconBroadcast = (p) => <Icon {...p}><circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 000 7M15.5 8.5a5 5 0 010 7M5.5 5.5a9 9 0 000 13M18.5 5.5a9 9 0 010 13"/></Icon>;
const IconPay = (p) => <Icon {...p}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/></Icon>;
const IconMosque = (p) => <Icon {...p}><path d="M3 20V10a9 9 0 0118 0v10M3 20h18M9 20v-5a3 3 0 016 0v5M12 5v-3M11 2h2"/></Icon>;
const IconContact = (p) => <Icon {...p}><path d="M4 5h16v14H7l-3 3V5z"/><path d="M8 10h8M8 14h5"/></Icon>;
const IconBio = (p) => <Icon {...p}><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="9" r="2.5"/><path d="M8 16c1-2 2.5-3 4-3s3 1 4 3"/></Icon>;
const IconSocial = (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></Icon>;
const IconSun = (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></Icon>;
const IconMoon = (p) => <Icon {...p}><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></Icon>;
const IconPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
const IconCheck = (p) => <Icon {...p}><path d="M5 13l4 4L19 7"/></Icon>;
const IconSkipForward = (p) => <Icon {...p}><path d="M5 5l9 7-9 7V5z" fill="currentColor"/><rect x="16" y="5" width="2" height="14" fill="currentColor" stroke="none"/></Icon>;
const IconSkipBack = (p) => <Icon {...p}><path d="M19 5l-9 7 9 7V5z" fill="currentColor"/><rect x="6" y="5" width="2" height="14" fill="currentColor" stroke="none"/></Icon>;
const IconVolume = (p) => <Icon {...p}><path d="M3 9h4l5-4v14l-5-4H3V9z" fill="currentColor"/><path d="M16 8a5 5 0 010 8M19 5a9 9 0 010 14"/></Icon>;
const IconMenu = (p) => <Icon {...p}><path d="M3 6h18M3 12h18M3 18h18"/></Icon>;

// Small ornamental star — for decorative accents
const Ornament = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 0l1.8 4.5L14 5l-3.5 3 1 4.5L8 10l-3.5 2.5L5.5 8 2 5l4.2-.5L8 0z"
      fill={color} opacity="0.8"/>
  </svg>
);

// Decorative divider — thin line with center ornament
const DecoDivider = ({ color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: color || 'var(--gold)' }}>
    <div style={{ flex: 1, height: 1, background: 'currentColor', opacity: 0.25 }} />
    <div style={{ width: 6, height: 6, transform: 'rotate(45deg)', background: 'currentColor', opacity: 0.5 }} />
    <div style={{ flex: 1, height: 1, background: 'currentColor', opacity: 0.25 }} />
  </div>
);

Object.assign(window, {
  Icon, IconHome, IconBook, IconMedia, IconMic, IconQuestion, IconSearch, IconBell,
  IconBookmark, IconNote, IconList, IconGrid, IconPlay, IconPause, IconArrowLeft,
  IconArrowRight, IconChevronLeft, IconChevronRight, IconChevronDown, IconClose,
  IconSettings, IconShare, IconDownload, IconFolder, IconImage, IconHeadphones,
  IconCalendar, IconType, IconDots, IconUser, IconLogin, IconNews, IconBroadcast,
  IconPay, IconMosque, IconContact, IconBio, IconSocial, IconSun, IconMoon,
  IconPlus, IconCheck, IconSkipForward, IconSkipBack, IconVolume, IconMenu,
  Ornament, DecoDivider,
});
