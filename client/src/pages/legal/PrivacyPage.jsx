import React from 'react';

export default function PrivacyPage() {
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', background: 'var(--bg)' }}>
      <h1>Privacy Policy</h1>
      <p style={{ color: 'var(--text-muted)' }}>Last updated: {new Date().toLocaleDateString()}</p>
      
      <div style={{ marginTop: '32px' }}>
        <h2>1. Information We Collect</h2>
        <p>We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us.</p>
        
        <h2 style={{ marginTop: '24px' }}>2. How We Use Your Information</h2>
        <p>We use the information we collect about you to provide, maintain, and improve our services, such as to facilitate payments, send receipts, provide products and services you request, develop new features, provide customer support to Users, and send product updates.</p>
        
        <h2 style={{ marginTop: '24px' }}>3. Data Storage</h2>
        <p>Your data is stored securely in our databases. We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.</p>
        
        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <a href="/" className="btn btn--secondary">Back to Home</a>
        </div>
      </div>
    </div>
  );
}
