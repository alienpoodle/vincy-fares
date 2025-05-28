
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FareCalculator } from './components/FareCalculator';
import { Theme } from './types';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      return storedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.DARK : Theme.LIGHT;
  });

  useEffect(() => {
    if (theme === Theme.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT);
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark transition-colors duration-300 font-sans">
      <Header currentTheme={theme} toggleTheme={toggleTheme} />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <FareCalculator />
      </main>
      <footer className="text-center py-4 text-muted-light dark:text-muted-dark text-sm">
        <p>&copy; {new Date().getFullYear()} SVG Fare Calculator. Fares subject to change.</p>
      </footer>
    </div>
  );
};

export default App;
