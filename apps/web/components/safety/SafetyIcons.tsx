import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const line = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function BrandMark({ className = "h-10 w-10", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="CyberPulse Scam Shield" {...props}>
      <rect x="2" y="2" width="44" height="44" rx="14" fill="#092B4C" />
      <path d="M24 9.5 36 14v8.6c0 8-4.7 13.1-12 16-7.3-2.9-12-8-12-16V14Z" fill="#0E6B73" stroke="#BDEBF0" strokeWidth="1.6" />
      <path d="M14.8 24.2h5l2.3-5.3 4.1 10.2 2.5-5h4.5" {...line} stroke="#FFF" strokeWidth="2.4" />
      <circle cx="14.8" cy="24.2" r="1.5" fill="#F4B942" />
      <circle cx="33.2" cy="24.2" r="1.5" fill="#F4B942" />
    </svg>
  );
}

function IconBase({ children, className = "h-5 w-5", ...props }: IconProps & { children: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...line} strokeWidth="1.8" {...props}>{children}</svg>;
}

export function HomeIcon(props: IconProps) { return <IconBase {...props}><path d="m4 10 8-6.5 8 6.5v9.5H15v-6H9v6H4Z" /><path d="M7 9.5v-2l5-4 5 4v2" /></IconBase>; }
export function ScanIcon(props: IconProps) { return <IconBase {...props}><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><circle cx="12" cy="12" r="4" /><path d="m10.3 12 1.2 1.2 2.4-2.5" /></IconBase>; }
export function VerifyIcon(props: IconProps) { return <IconBase {...props}><path d="M12 3.2 5.5 5.8v5.4c0 4.5 2.5 7.6 6.5 9.6 4-2 6.5-5.1 6.5-9.6V5.8Z" /><path d="m9.2 12 1.8 1.8 3.9-4" /></IconBase>; }
export function ReportIcon(props: IconProps) { return <IconBase {...props}><path d="M12 3.5 21 20H3Z" /><path d="M12 9v5M12 17.5h.01" /></IconBase>; }
export function TrackIcon(props: IconProps) { return <IconBase {...props}><path d="M5 5h10M5 10h7M5 15h5" /><circle cx="16.5" cy="16.5" r="3.5" /><path d="m19 19 2 2" /></IconBase>; }
export function GlobeIcon(props: IconProps) { return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.4 2.4 3.6 5.4 3.6 9S14.4 18.6 12 21M12 3c-2.4 2.4-3.6 5.4-3.6 9s1.2 6.6 3.6 9" /></IconBase>; }
export function MicrophoneIcon(props: IconProps) { return <IconBase {...props}><rect x="8.5" y="3" width="7" height="11" rx="3.5" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" /></IconBase>; }
export function AgentIcon(props: IconProps) { return <IconBase {...props}><path d="M12 3.2 5.5 5.8v5.4c0 4.5 2.5 7.6 6.5 9.6 4-2 6.5-5.1 6.5-9.6V5.8Z" /><path d="M8.5 12h1l1.1-2.3 2.1 4.6 1.1-2.3h1.7" /></IconBase>; }
export function PhoneIcon(props: IconProps) { return <IconBase {...props}><path d="M6 3.8h3.3l1.6 4-2 1.4a13.5 13.5 0 0 0 5.9 5.9l1.4-2 4 1.6V18a2.2 2.2 0 0 1-2.2 2.2C10.2 20.2 3.8 13.8 3.8 6A2.2 2.2 0 0 1 6 3.8Z" /></IconBase>; }
export function ClockIcon(props: IconProps) { return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.4 2" /></IconBase>; }
export function SignalShieldIcon(props: IconProps) { return <IconBase {...props}><path d="M12 3.2 5.5 5.8v5.4c0 4.5 2.5 7.6 6.5 9.6 4-2 6.5-5.1 6.5-9.6V5.8Z" /><path d="M7.8 12h2l1-2.3 2.1 4.8 1.1-2.5h2.2" /></IconBase>; }
export function ArrowIcon(props: IconProps) { return <IconBase {...props}><path d="M5 12h13M14 8l4 4-4 4" /></IconBase>; }
export function SendIcon(props: IconProps) { return <IconBase {...props}><path d="m4 5 16 7-16 7 2-7Z" /><path d="M6 12h7" /></IconBase>; }
export function VolumeIcon({ muted = false, ...props }: IconProps & { muted?: boolean }) { return <IconBase {...props}><path d="M5 10v4h3l4 3V7l-4 3Z" />{muted ? <path d="m17 10 4 4m0-4-4 4" /> : <><path d="M16 9a4 4 0 0 1 0 6" /><path d="M18.5 6.5a8 8 0 0 1 0 11" /></>}</IconBase>; }
export function CloseIcon(props: IconProps) { return <IconBase {...props}><path d="m6 6 12 12M18 6 6 18" /></IconBase>; }
export function CopyIcon(props: IconProps) { return <IconBase {...props}><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" /></IconBase>; }
export function CheckIcon(props: IconProps) { return <IconBase {...props}><path d="m5 12.5 4.5 4.5L19 7.5" /></IconBase>; }
export function ArrowUpIcon(props: IconProps) { return <IconBase {...props}><path d="M12 19V5M6 11l6-6 6 6" /></IconBase>; }
export function StopIcon(props: IconProps) { return <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" {...props}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>; }
