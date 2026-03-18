import React from 'react';
import Nav from './Nav.jsx';

export default function Layout({ children, variant }) {
  if (variant === 'full') {
    return (
      <div className="app-shell grid-bg">
        <Nav />
        <div className="app-full">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="app-shell grid-bg">
      <Nav />
      <main className="app-main fade-up">
        {children}
      </main>
    </div>
  );
}
