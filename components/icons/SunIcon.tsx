
import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {}

export const SunIcon: React.FC<IconProps> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    {...props}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-6.364-.386l1.591-1.591M3 12h2.25m.386-6.364l1.591 1.591M12 12a2.25 2.25 0 00-2.25 2.25A2.25 2.25 0 0012 12zm0 0a2.25 2.25 0 012.25 2.25A2.25 2.25 0 0112 12zm0 0V7.5m0 9V12m0-4.5a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 0112 7.5z" 
    />
  </svg>
);
