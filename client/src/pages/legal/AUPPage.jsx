import React from 'react';

export default function AUPPage() {
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', background: 'var(--bg)' }}>
      <h1>Acceptable Use Policy</h1>
      <p style={{ color: 'var(--text-muted)' }}>Last updated: {new Date().toLocaleDateString()}</p>
      
      <div style={{ marginTop: '32px' }}>
        <h2>1. Prohibited Activities</h2>
        <p>You may not use the Service to engage in any illegal activities or to promote illegal activities. You may not use the Service to transmit or store material that is obscene, threatening, abusive, libelous, or otherwise objectionable.</p>
        
        <h2 style={{ marginTop: '24px' }}>2. Fair Use</h2>
        <p>We provide generous limits on our AI generation and storage features, but we reserve the right to restrict or suspend your account if we determine that your usage is excessive or unreasonable.</p>
        
        <h2 style={{ marginTop: '24px' }}>3. Account Suspension</h2>
        <p>We reserve the right to suspend or terminate your account at any time for violation of this policy.</p>
        
        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <a href="/" className="btn btn--secondary">Back to Home</a>
        </div>
      </div>
    </div>
  );
}
