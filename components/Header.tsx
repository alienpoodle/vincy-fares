
import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { Theme } from '../types';

interface HeaderProps {
  currentTheme: Theme;
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTheme, toggleTheme }) => {
  return (
    <header className="bg-card-light dark:bg-card-dark shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <svg 
            className="w-10 h-10 text-primary-DEFAULT dark:text-primary-light mr-3" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-DEFAULT dark:text-primary-light">
            SVG Taxi Fares
          </h1>
        </div>
        <ThemeToggle currentTheme={currentTheme} toggleTheme={toggleTheme} />
      </div>
    </header>
  );
};
