import type { SVGProps } from 'react';
import './fresh-analytics-icons.css';

type IconProps=SVGProps<SVGSVGElement>;
function IconBase({children,...props}:IconProps){return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>}

export const SlumpIcon=(props:IconProps)=><IconBase {...props}><path d="M6 5h12M8 5l1.5 14h5L16 5"/><path d="M10 11h4M9.5 15h5"/></IconBase>;
export const TemperatureIcon=(props:IconProps)=><IconBase {...props}><path d="M10 14.8V5a2 2 0 1 1 4 0v9.8a4 4 0 1 1-4 0Z"/><path d="M12 9v7"/></IconBase>;
export const DensityIcon=(props:IconProps)=><IconBase {...props}><path d="m7 7 5-3 5 3v10l-5 3-5-3Z"/><path d="m7 7 5 3 5-3M12 10v10"/></IconBase>;
export const StrengthIcon=(props:IconProps)=><IconBase {...props}><path d="M4 18h16"/><path d="M7 18V9h10v9"/><path d="M9 9V6h6v3"/><path d="M10 13h4"/></IconBase>;
export const TrendIcon=(props:IconProps)=><IconBase {...props}><path d="M4 16l5-5 4 3 7-7"/><path d="M15 7h5v5"/></IconBase>;
export const MeanIcon=(props:IconProps)=><IconBase {...props}><path d="M17 4H7l5 8-5 8h10"/></IconBase>;
export const SdIcon=(props:IconProps)=><IconBase {...props}><path d="M5 17c2-5 4-10 7-10s4 5 7 10"/><path d="M4 17h16"/></IconBase>;
export const CvIcon=(props:IconProps)=><IconBase {...props}><circle cx="8" cy="8" r="2"/><circle cx="16" cy="16" r="2"/><path d="M7 17 17 7"/></IconBase>;
export const CountIcon=(props:IconProps)=><IconBase {...props}><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></IconBase>;
export const CalendarIcon=(props:IconProps)=><IconBase {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></IconBase>;
export const SourceIcon=(props:IconProps)=><IconBase {...props}><path d="M3 20h18M5 20V9l5-3v14M10 12l5-3v11M15 13l4-2v9"/></IconBase>;
export const MixIconSmall=(props:IconProps)=><IconBase {...props}><path d="M9 3h6M10 3v5l-4 8a3 3 0 0 0 2.7 4.3h6.6A3 3 0 0 0 18 16l-4-8V3"/><path d="M8 15h8"/></IconBase>;
