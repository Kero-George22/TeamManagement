import React, { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = [
  { id: 'cyberpunk', label: 'Cyberpunk', colors: ['#00e5ff', '#ffd700', '#9b6dff'] },
  { id: 'synthwave', label: 'Synthwave', colors: ['#ff00ff', '#ff71ce', '#b967ff'] },
  { id: 'matrix',   label: 'Matrix',    colors: ['#39ff14', '#00ff41', '#007700'] },
  { id: 'solar',    label: 'Solar',     colors: ['#ff8c00', '#ffcc00', '#ff4500'] },
  { id: 'ice',      label: 'Ice',       colors: ['#a8d8ff', '#e0f4ff', '#6ca6ff'] },
  { id: 'obsidian', label: 'Obsidian',  colors: ['#e0e0e0', '#bbbbbb', '#666666'] },
];

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('jxp-theme') || 'cyberpunk'
  );

  function setTheme(id) {
    setThemeState(id);
    localStorage.setItem('jxp-theme', id);
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
