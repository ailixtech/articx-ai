// Line icons (24px grid, stroke = currentColor).
const I = ({ children, className = "i", ...rest }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...rest}>{children}</svg>
);

export const SidebarIcon = (p) => <I {...p}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /></I>;
export const PenIcon = (p) => <I {...p}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></I>;
export const SearchIcon = (p) => <I {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></I>;
export const MenuIcon = (p) => <I {...p}><path d="M4 7h16M4 12h10M4 17h16" /></I>;
export const CloseIcon = (p) => <I {...p}><path d="M6 6l12 12M18 6 6 18" /></I>;
export const MoonIcon = (p) => <I {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></I>;
export const SunIcon = (p) => <I {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></I>;
export const MonitorIcon = (p) => <I {...p}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></I>;
export const HistoryIcon = (p) => <I {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></I>;
export const HelpIcon = (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" /></I>;
export const GearIcon = (p) => <I {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></I>;
export const LogoutIcon = (p) => <I {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" /></I>;
export const ArrowUpIcon = (p) => <I {...p}><path d="M12 19V5M5 12l7-7 7 7" /></I>;
export const CopyIcon = (p) => <I {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></I>;
export const CheckIcon = (p) => <I {...p}><path d="m5 12 5 5 9-10" /></I>;
export const TrashIcon = (p) => <I {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></I>;
export const ChatIcon = (p) => <I {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></I>;
export const DatabaseIcon = (p) => <I {...p}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" /></I>;
export const LockIcon = (p) => <I {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></I>;
export const InfoIcon = (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></I>;
export const ChipIcon = (p) => <I {...p}><rect x="5" y="5" width="14" height="14" rx="3" /><path d="M9 9h6v6H9zM9 2v3M15 2v3M9 19v3M15 19v3M19 9h3M19 15h3M2 9h3M2 15h3" /></I>;
export const UserIcon = (p) => <I {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></I>;
export const ShieldIcon = (p) => <I {...p}><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></I>;
export const GaugeIcon = (p) => <I {...p}><path d="M4.2 18a9 9 0 1 1 15.6 0" /><path d="m12 13 4-4" /><circle cx="12" cy="13" r="1" /></I>;
export const CardIcon = (p) => <I {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></I>;
export const DevicesIcon = (p) => <I {...p}><rect x="2" y="4" width="14" height="11" rx="2" /><rect x="15" y="9" width="7" height="12" rx="1.5" /><path d="M6 19h6" /></I>;

export const MoreIcon = (p) => <I {...p}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></I>;
export const PinIcon = (p) => <I {...p}><path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z" /></I>;
export const UnpinIcon = (p) => <I {...p}><path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3zM3 3l18 18" /></I>;
export const ShareIcon = (p) => <I {...p}><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></I>;
export const ThumbUpIcon = (p) => <I {...p}><path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zM7 11l4-8a2.5 2.5 0 0 1 2.5 2.8L13 10h5.5a2 2 0 0 1 2 2.4l-1.4 6A2 2 0 0 1 17.2 20H7" /></I>;
export const ThumbDownIcon = (p) => <I {...p}><path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1zM17 13l-4 8a2.5 2.5 0 0 1-2.5-2.8L11 14H5.5a2 2 0 0 1-2-2.4l1.4-6A2 2 0 0 1 6.8 4H17" /></I>;
export const MailIcon = (p) => <I {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></I>;
export const SparkIcon = (p) => <I {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5" /></I>;
export const LinkIcon = (p) => <I {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></I>;

export const StopIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
);
// The maple leaf from the flag of Canada.
export const Leaf = ({ size = 12, className = "" }) => (
  <svg viewBox="-2015 -2010 4030 4050" width={size} height={size} aria-hidden="true" className={`flex-none text-red ${className}`}>
    <path fill="currentColor" d="m-90 2030 45-863a95 95 0 0 0-111-98l-859 151 116-320a65 65 0 0 0-20-73l-941-762 212-99a65 65 0 0 0 34-79l-186-572 542 115a65 65 0 0 0 73-38l105-247 423 454a65 65 0 0 0 111-57l-204-1052 327 189a65 65 0 0 0 91-27l332-652 332 652a65 65 0 0 0 91 27l327-189-204 1052a65 65 0 0 0 111 57l423-454 105 247a65 65 0 0 0 73 38l542-115-186 572a65 65 0 0 0 34 79l212 99-941 762a65 65 0 0 0-20 73l116 320-859-151a95 95 0 0 0-111 98l45 863z" />
  </svg>
);
