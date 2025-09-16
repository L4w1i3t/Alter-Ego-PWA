import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const toPx = (v?: number | string, fallback = 20) =>
  typeof v === 'number' ? v : v || fallback;

export const HamburgerIcon: React.FC<IconProps> = ({ size = 24, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor" />
    <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor" />
    <rect x="3" y="16" width="18" height="2" rx="1" fill="currentColor" />
  </svg>
);

export const ImageIcon: React.FC<IconProps> = ({ size = 20, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <circle cx="9" cy="10" r="2" fill="currentColor" />
    <path
      d="M6 17l4-4 3 3 2-2 3 3"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinejoin="round"
    />
  </svg>
);

export const HeadphonesIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M4 13a8 8 0 0116 0"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
    />
    <rect x="3" y="13" width="4" height="7" rx="2" fill="currentColor" />
    <rect x="17" y="13" width="4" height="7" rx="2" fill="currentColor" />
  </svg>
);

export const WaveIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M3 12c2-4 4 4 6 0s4 4 6 0 4 4 6 0"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

export const GearIcon: React.FC<IconProps> = ({ size = 20, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M12 8a4 4 0 100 8 4 4 0 000-8z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
    />
    <path
      d="M4 12a8 8 0 0116 0m-2.5 5.5l-1.5-1m-8 1l-1.5-1m0-9l1.5-1m8 1l1.5-1"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
  </svg>
);

export const PaperclipIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M8.5 12.5l6-6a3.5 3.5 0 015 5l-8 8a5 5 0 11-7.07-7.07l8-8"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

export const MicrophoneIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <rect
      x="9"
      y="4"
      width="6"
      height="10"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path d="M5 11a7 7 0 0014 0" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 18v3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export const CameraIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M4 7h3l2-2h6l2 2h3a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z"
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
    />
    <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const SendIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M4 12l16-7-7 16-2-6-7-3z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinejoin="round"
    />
  </svg>
);

export const KeyIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <circle cx="8" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M12 12h8l-2 2 2 2-2 2"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

export const UserIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M4 20c1.5-3 5-5 8-5s6.5 2 8 5"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
    />
  </svg>
);

export const MemoryIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <rect
      x="3"
      y="6"
      width="18"
      height="12"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path d="M7 10h10M7 14h6" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export const WrenchIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M14 6a4 4 0 105.66 5.66L14 6z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
    />
    <path
      d="M13 7l-8 8 4 4 8-8"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
    />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M12 3v10m0 0l-4-4m4 4l4-4"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
    />
    <rect x="4" y="17" width="16" height="3" rx="1.5" fill="currentColor" />
  </svg>
);

export const InfoIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 10v6" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="7" r="1" fill="currentColor" />
  </svg>
);

export const WarningIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M12 3l10 18H2L12 3z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
    />
    <path d="M12 9v5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

export const ShieldIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M12 3l8 3v6c0 5-3 8-8 9-5-1-8-4-8-9V6l8-3z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
    />
  </svg>
);

export const StarIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
    />
  </svg>
);

export const HeartIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M12 20s-7-4.5-7-9a4 4 0 017-3 4 4 0 017 3c0 4.5-7 9-7 9z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
    />
  </svg>
);

export const FlagIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path d="M5 3v18" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M6 4h11l-2 4 2 4H6"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
    />
  </svg>
);

export const ArrowLeftIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M14 6l-6 6 6 6"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
    />
    <path d="M20 12H8" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ size = 18, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path d="M5 7h14" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9 7V5h6v2" stroke="currentColor" strokeWidth="1.8" />
    <rect
      x="6"
      y="7"
      width="12"
      height="12"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 14, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M5 13l4 4 10-10"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 16, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M6 6l12 12M18 6L6 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const PlayIcon: React.FC<IconProps> = ({ size = 16, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path d="M8 5l10 7-10 7V5z" fill="currentColor" />
  </svg>
);

export const PauseIcon: React.FC<IconProps> = ({ size = 16, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <rect x="6" y="5" width="4" height="14" fill="currentColor" />
    <rect x="14" y="5" width="4" height="14" fill="currentColor" />
  </svg>
);

export const PencilIcon: React.FC<IconProps> = ({ size = 16, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M14 4l6 6-9 9H5v-6l9-9z"
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
    />
  </svg>
);

export const EyeIcon: React.FC<IconProps> = ({ size = 16, ...rest }) => (
  <svg
    width={toPx(size)}
    height={toPx(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...rest}
  >
    <path
      d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export default {
  HamburgerIcon,
  ImageIcon,
  HeadphonesIcon,
  WaveIcon,
  GearIcon,
  PaperclipIcon,
  MicrophoneIcon,
  CameraIcon,
  SendIcon,
  KeyIcon,
  UserIcon,
  MemoryIcon,
  WrenchIcon,
  DownloadIcon,
  InfoIcon,
  WarningIcon,
  ShieldIcon,
  StarIcon,
  HeartIcon,
  FlagIcon,
  ArrowLeftIcon,
  TrashIcon,
  CheckIcon,
  CloseIcon,
  PlayIcon,
  PauseIcon,
  PencilIcon,
  EyeIcon,
};
