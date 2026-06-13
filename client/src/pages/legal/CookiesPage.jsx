import React from 'react';

export default function CookiesPage() {
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', background: 'var(--bg)' }}>
      <h1>Cookie Policy</h1>
      <p style={{ color: 'var(--text-muted)' }}>Last updated: {new Date().toLocaleDateString()}</p>
      
      <div style={{ marginTop: '32px' }}>
        <h2>1. What Are Cookies</h2>
        <p>Cookies are small pieces of text sent by your web browser by a website you visit. A cookie file is stored in your web browser and allows the Service or a third-party to recognize you and make your next visit easier and the Service more useful to you.</p>
        
        <h2 style={{ marginTop: '24px' }}>2. How We Use Cookies</h2>
        <p>We use cookies to enable certain functions of the Service, to provide analytics, to store your preferences, and to enable advertisements delivery.</p>
        
        <h2 style={{ marginTop: '24px' }}>3. Your Choices Regarding Cookies</h2>
        <p>If you'd like to delete cookies or instruct your web browser to delete or refuse cookies, please visit the help pages of your web browser. Please note that if you delete cookies or refuse to accept them, you might not be able to use all of the features we offer.</p>
        
        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <a href="/" className="btn btn--secondary">Back to Home</a>
        </div>
      </div>
    </div>
  );
}
