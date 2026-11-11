const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

function Icon({ children, size = 18, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      {children}
    </svg>
  );
}

export const SearchIcon = (p) => (
  <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></Icon>
);
export const ArrowRight = (p) => (
  <Icon {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icon>
);
export const ArrowLeft = (p) => (
  <Icon {...p}><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></Icon>
);
export const MenuIcon = (p) => (
  <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>
);
export const CloseIcon = (p) => (
  <Icon {...p}><path d="m6 6 12 12M18 6 6 18" /></Icon>
);
export const GithubIcon = (p) => (
  <Icon {...p}><path d="M9 19c-4 1.5-4-2.5-6-3m12 6v-3.9a3.4 3.4 0 0 0-.9-2.7c3-.3 6.2-1.5 6.2-6.8a5.3 5.3 0 0 0-1.4-3.7 4.9 4.9 0 0 0-.1-3.6s-1.1-.3-3.6 1.3a12.4 12.4 0 0 0-6.5 0C6.2 1.6 5.1 1.9 5.1 1.9a4.9 4.9 0 0 0-.1 3.6A5.3 5.3 0 0 0 3.6 9c0 5.2 3.2 6.4 6.2 6.8a3.4 3.4 0 0 0-.9 2.6V22" /></Icon>
);
export const LinkedinIcon = (p) => (
  <Icon {...p}><path d="M4 9v11" /><path d="M4 4.5v.01" /><path d="M9 20v-6a3 3 0 0 1 6 0v6" /><path d="M9 9v11" /></Icon>
);
export const MailIcon = (p) => (
  <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Icon>
);
export const LinkIcon = (p) => (
  <Icon {...p}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></Icon>
);
export const XIcon = (p) => (
  <Icon {...p}><path d="M4 4l16 16M20 4 4 20" /></Icon>
);
export const RssIcon = (p) => (
  <Icon {...p}><path d="M5 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 5a15 15 0 0 1 15 15" /></Icon>
);
export const CalendarIcon = (p) => (
  <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></Icon>
);
export const ClockIcon = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
);
export const EyeIcon = (p) => (
  <Icon {...p}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></Icon>
);
export const EditIcon = (p) => (
  <Icon {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icon>
);
export const TrashIcon = (p) => (
  <Icon {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" /></Icon>
);
export const PlusIcon = (p) => (
  <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
);
export const UploadIcon = (p) => (
  <Icon {...p}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></Icon>
);
export const DownloadIcon = (p) => (
  <Icon {...p}><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 20h16" /></Icon>
);
export const LogOutIcon = (p) => (
  <Icon {...p}><path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" /><path d="M16 17l5-5-5-5M21 12H9" /></Icon>
);
export const CheckIcon = (p) => (
  <Icon {...p}><path d="m5 12 4 4L19 6" /></Icon>
);
export const ExternalIcon = (p) => (
  <Icon {...p}><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v6H4V6h6" /></Icon>
);
export const ShieldIcon = (p) => (
  <Icon {...p}><path d="M12 3 5 6v5c0 4.4 3 8.4 7 10 4-1.6 7-5.6 7-10V6Z" /><path d="m9 12 2 2 4-4" /></Icon>
);
export const BookIcon = (p) => (
  <Icon {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M4 19.5V5a2 2 0 0 1 2-2h14v18H6.5" /></Icon>
);
export const DashboardIcon = (p) => (
  <Icon {...p}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></Icon>
);
export const FileIcon = (p) => (
  <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></Icon>
);
export const TagIcon = (p) => (
  <Icon {...p}><path d="M20 13 13 20l-9-9V4h7l9 9Z" /><circle cx="8" cy="8" r="1.2" /></Icon>
);
export const UsersIcon = (p) => (
  <Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="3.5" /><path d="M22 21v-2a4 4 0 0 0-3-3.8" /><path d="M16 3.5a3.5 3.5 0 0 1 0 7" /></Icon>
);
export const SendIcon = (p) => (
  <Icon {...p}><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></Icon>
);
export const BoltIcon = (p) => (
  <Icon {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7Z" /></Icon>
);
export const ChevronLeft = (p) => (
  <Icon {...p}><path d="m15 18-6-6 6-6" /></Icon>
);
export const ChevronRight = (p) => (
  <Icon {...p}><path d="m9 18 6-6-6-6" /></Icon>
);
export const StarIcon = (p) => (
  <Icon {...p}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9Z" /></Icon>
);
export const SettingsIcon = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></Icon>
);
