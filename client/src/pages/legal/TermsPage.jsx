import React from 'react';

export default function TermsPage() {
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', background: 'var(--bg)' }}>
      <h1>Terms of Service</h1>
      <p style={{ color: 'var(--text-muted)' }}>Last updated: {new Date().toLocaleDateString()}</p>
      
      <div style={{ marginTop: '32px' }}>
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing and using SyncUp, you accept and agree to be bound by the terms and provision of this agreement.</p>
        
        <h2 style={{ marginTop: '24px' }}>2. Description of Service</h2>
        <p>SyncUp provides team management and collaboration tools. We reserve the right to modify or discontinue, temporarily or permanently, the service with or without notice.</p>
        
        <h2 style={{ marginTop: '24px' }}>3. User Conduct</h2>
        <p>You agree to use the service only for lawful purposes. You are solely responsible for the knowledge of and adherence to any and all laws, rules, and regulations pertaining to your use of the services.</p>
        
        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <a href="/" className="btn btn--secondary">Back to Home</a>
        </div>
      </div>
    </div>
  );
}
