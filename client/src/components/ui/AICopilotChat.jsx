import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import API from '../../lib/api';
import Avatar from './Avatar';

export default function AICopilotChat({ projectId, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'model', content: "Hi! I'm your AI Copilot. How can I help you manage this project?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Map format for Gemini
      const history = messages.slice(1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const res = await API.ai.chat(projectId, userMessage, history);
      setMessages(prev => [...prev, { role: 'model', content: res.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: "❌ Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: 380,
      height: 520,
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(to right, var(--surface), var(--surface-hover))'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <i className="fa-solid fa-robot" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>AI Copilot</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Project Assistant</div>
          </div>
        </div>
        <button className="tool-btn" onClick={onClose}>
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}>
            <div style={{
              background: m.role === 'user' ? 'var(--blue)' : 'var(--surface-hover)',
              color: m.role === 'user' ? '#fff' : 'var(--text)',
              padding: '10px 14px',
              borderRadius: m.role === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
              fontSize: '0.9rem',
              lineHeight: 1.5
            }}>
              {m.role === 'model' ? (
                <div className="markdown-body" style={{ background: 'transparent', fontSize: '0.9rem' }}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 6 }} /> Thinking...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            style={{ flex: 1, borderRadius: 20 }}
            placeholder="Ask about your project..."
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button 
            type="submit" 
            className="btn btn--blue" 
            style={{ width: 40, height: 40, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            disabled={!input.trim() || loading}
          >
            <i className="fa-solid fa-paper-plane" />
          </button>
        </form>
      </div>
    </div>
  );
}
