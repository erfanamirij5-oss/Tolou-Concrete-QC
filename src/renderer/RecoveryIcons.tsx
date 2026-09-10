import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}

export const DashboardIcon=(props:IconProps)=><IconBase {...props}><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></IconBase>;
export const ProjectsIcon=(props:IconProps)=><IconBase {...props}><path d="M4 20V8l8-4 8 4v12"/><path d="M9 20v-5h6v5"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></IconBase>;
export const SamplingIcon=(props:IconProps)=><IconBase {...props}><path d="M9 3h6"/><path d="M10 3v5l-4.5 8.2A3.2 3.2 0 0 0 8.3 21h7.4a3.2 3.2 0 0 0 2.8-4.8L14 8V3"/><path d="M8 15h8"/></IconBase>;
export const FreshIcon=(props:IconProps)=><IconBase {...props}><path d="M12 3s5 5.5 5 10a5 5 0 0 1-10 0c0-4.5 5-10 5-10Z"/><path d="M9.5 14.5c.7 1.2 1.6 1.7 2.8 1.8"/></IconBase>;
export const SpecimenIcon=(props:IconProps)=><IconBase {...props}><path d="m7 7 5-3 5 3v10l-5 3-5-3Z"/><path d="m7 7 5 3 5-3M12 10v10"/></IconBase>;
export const ResultIcon=(props:IconProps)=><IconBase {...props}><path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h5M8 17h8"/><path d="m15 13 1 1 2-2"/></IconBase>;
export const ReviewIcon=(props:IconProps)=><IconBase {...props}><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></IconBase>;
export const AnalyticsIcon=(props:IconProps)=><IconBase {...props}><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></IconBase>;
export const ReportsIcon=(props:IconProps)=><IconBase {...props}><path d="M6 3h9l3 3v15H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></IconBase>;
export const MixIcon=(props:IconProps)=><IconBase {...props}><path d="M4 17h16M6 17l2-8h8l2 8"/><path d="M9 9V5h6v4M10 13h4"/></IconBase>;
export const SettingsIcon=(props:IconProps)=><IconBase {...props}><circle cx="12" cy="12" r="3"/><path d="M19 12a7.2 7.2 0 0 0-.1-1l2-1.6-2-3.4-2.5 1a7.5 7.5 0 0 0-1.7-1L14.3 3h-4.6l-.4 3a7.5 7.5 0 0 0-1.7 1l-2.5-1-2 3.4 2 1.6a7.2 7.2 0 0 0 0 2l-2 1.6 2 3.4 2.5-1a7.5 7.5 0 0 0 1.7 1l.4 3h4.6l.4-3a7.5 7.5 0 0 0 1.7-1l2.5 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z"/></IconBase>;
