import React, { useState, useEffect } from 'react';
import API from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../lib/toast';
import Avatar from '../ui/Avatar';

export default function TeamHubTab({ projectId, isOwner }) {
  const { user } = useAuth();
  const toast = useToast();
  
  const [subTab, setSubTab] = useState('polls-suggestions');
  
  // Data states
  const [polls, setPolls] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [instructions, setInstructions] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [pollForm, setPollForm] = useState({ question: '', option1: '', option2: '' });
  const [suggestionForm, setSuggestionForm] = useState({ title: '', description: '' });
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [decisionForm, setDecisionForm] = useState({ title: '', description: '' });
  const [instructionForm, setInstructionForm] = useState({ title: '', content: '', priority: 'Normal' });

  useEffect(() => {
    loadData();
  }, [projectId, subTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (subTab === 'polls-suggestions') {
        const [p, s] = await Promise.all([
          API.teamFeatures.getPolls(projectId),
          API.teamFeatures.getSuggestions(projectId)
        ]);
        setPolls(p || []);
        setSuggestions(s || []);
      } else if (subTab === 'notes') {
        const n = await API.teamFeatures.getNotes(projectId);
        setNotes(n || []);
      } else if (subTab === 'decisions-instructions') {
        const [d, i] = await Promise.all([
          API.teamFeatures.getDecisions(projectId),
          API.teamFeatures.getInstructions(projectId)
        ]);
        setDecisions(d || []);
        setInstructions(i || []);
      }
    } catch (err) {
      toast.error('Failed to load team hub data');
    } finally {
      setLoading(false);
    }
  }

  // Poll Handlers
  async function handleCreatePoll(e) {
    e.preventDefault();
    if (!pollForm.question || !pollForm.option1 || !pollForm.option2) {
      return toast.error('Fill required poll fields');
    }
    try {
      await API.teamFeatures.createPoll(projectId, {
        question: pollForm.question,
        options: [pollForm.option1, pollForm.option2]
      });
      setPollForm({ question: '', option1: '', option2: '' });
      toast.success('Poll created');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleVotePoll(pollId, optionId) {
    try {
      await API.teamFeatures.votePoll(projectId, pollId, optionId);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Suggestion Handlers
  async function handleCreateSuggestion(e) {
    e.preventDefault();
    try {
      await API.teamFeatures.createSuggestion(projectId, suggestionForm);
      setSuggestionForm({ title: '', description: '' });
      toast.success('Suggestion posted');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleVoteSuggestion(suggestionId, type) {
    try {
      await API.teamFeatures.voteSuggestion(projectId, suggestionId, type);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleUpdateSuggestionStatus(suggestionId, status) {
    try {
      await API.teamFeatures.updateSuggestionStatus(projectId, suggestionId, status);
      toast.success('Status updated');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Note Handlers
  async function handleCreateNote(e) {
    e.preventDefault();
    try {
      await API.teamFeatures.createNote({ projectId, ...noteForm });
      setNoteForm({ title: '', content: '' });
      toast.success('Note added');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDeleteNote(noteId) {
    try {
      await API.teamFeatures.deleteNote(noteId);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Decision & Instruction Handlers
  async function handleCreateDecision(e) {
    e.preventDefault();
    try {
      await API.teamFeatures.createDecision(projectId, decisionForm);
      setDecisionForm({ title: '', description: '' });
      toast.success('Decision recorded');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleCreateInstruction(e) {
    e.preventDefault();
    try {
      await API.teamFeatures.createInstruction(projectId, instructionForm);
      setInstructionForm({ title: '', content: '', priority: 'Normal' });
      toast.success('Instruction posted');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const userIdStr = String(user?.id || user?._id);

  return (
    <div className="workspace-panel" style={{ marginTop: 20 }}>
      <div className="workspace-header" style={{ marginBottom: 20 }}>
        <div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>Team Hub</h3>
          <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Collaborate, vote, and document team decisions.</div>
        </div>
      </div>

      <div className="workspace-tabs" style={{ marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <button className={`workspace-tab ${subTab === 'polls-suggestions' ? 'active' : ''}`} onClick={() => setSubTab('polls-suggestions')}>Polls & Suggestions</button>
        <button className={`workspace-tab ${subTab === 'notes' ? 'active' : ''}`} onClick={() => setSubTab('notes')}>Notes & Reminders</button>
        <button className={`workspace-tab ${subTab === 'decisions-instructions' ? 'active' : ''}`} onClick={() => setSubTab('decisions-instructions')}>Decisions & Instructions</button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
      ) : (
        <div className="team-hub-content">
          
          {/* POLLS & SUGGESTIONS */}
          {subTab === 'polls-suggestions' && (
            <div className="grid-2">
              <div className="hub-section">
                <h4>Active Polls</h4>
                <form onSubmit={handleCreatePoll} style={{ marginBottom: 20, padding: 15, background: 'var(--bg)', borderRadius: 10 }}>
                  <input className="form-input" placeholder="Question" value={pollForm.question} onChange={e => setPollForm({...pollForm, question: e.target.value})} style={{ marginBottom: 10 }} />
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <input className="form-input" placeholder="Option 1" value={pollForm.option1} onChange={e => setPollForm({...pollForm, option1: e.target.value})} />
                    <input className="form-input" placeholder="Option 2" value={pollForm.option2} onChange={e => setPollForm({...pollForm, option2: e.target.value})} />
                  </div>
                  <button className="btn btn--outline btn--sm" type="submit">Create Poll</button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  {polls.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No polls available.</p>}
                  {polls.map(poll => {
                    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
                    return (
                      <div key={poll._id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 15 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <Avatar user={poll.creator} size="sm" />
                          <div style={{ fontWeight: 600 }}>{poll.question}</div>
                        </div>
                        {poll.options.map(opt => {
                          const isVoted = opt.votes.some(v => String(v) === userIdStr);
                          const percentage = totalVotes ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                          return (
                            <div key={opt._id} style={{ marginBottom: 10 }}>
                              <button 
                                className={`btn btn--sm ${isVoted ? 'btn--green' : 'btn--ghost'}`} 
                                style={{ width: '100%', justifyContent: 'space-between', marginBottom: 5 }}
                                onClick={() => handleVotePoll(poll._id, opt._id)}
                              >
                                <span>{opt.text}</span>
                                <span>{opt.votes.length} ({percentage}%)</span>
                              </button>
                              <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--green)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="hub-section">
                <h4>Team Suggestions</h4>
                <form onSubmit={handleCreateSuggestion} style={{ marginBottom: 20, padding: 15, background: 'var(--bg)', borderRadius: 10 }}>
                  <input className="form-input" placeholder="Title" value={suggestionForm.title} onChange={e => setSuggestionForm({...suggestionForm, title: e.target.value})} style={{ marginBottom: 10 }} />
                  <textarea className="form-input" placeholder="Description" rows={2} value={suggestionForm.description} onChange={e => setSuggestionForm({...suggestionForm, description: e.target.value})} style={{ marginBottom: 10 }} />
                  <button className="btn btn--outline btn--sm" type="submit">Submit Suggestion</button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  {suggestions.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No suggestions yet.</p>}
                  {suggestions.map(sug => {
                    const hasUpvoted = sug.upvotes.some(v => String(v) === userIdStr);
                    const hasDownvoted = sug.downvotes.some(v => String(v) === userIdStr);
                    return (
                      <div key={sug._id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 15 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontWeight: 600 }}>{sug.title}</div>
                          <span className="badge" style={{ fontSize: '.7rem' }}>{sug.status}</span>
                        </div>
                        <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', margin: '8px 0' }}>{sug.description}</p>
                        
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
                          <button className={`btn btn--sm ${hasUpvoted ? 'btn--green' : 'btn--ghost'}`} onClick={() => handleVoteSuggestion(sug._id, 'up')}>
                            <i className="fa-solid fa-arrow-up" /> {sug.upvotes.length}
                          </button>
                          <button className={`btn btn--sm ${hasDownvoted ? 'btn--red' : 'btn--ghost'}`} onClick={() => handleVoteSuggestion(sug._id, 'down')}>
                            <i className="fa-solid fa-arrow-down" /> {sug.downvotes.length}
                          </button>
                          
                          {isOwner && (
                            <select className="form-input" style={{ padding: '4px 8px', height: 'auto', fontSize: '.8rem', marginLeft: 'auto' }} value={sug.status} onChange={e => handleUpdateSuggestionStatus(sug._id, e.target.value)}>
                              <option value="Pending">Pending</option>
                              <option value="Accepted">Accepted</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* NOTES & REMINDERS */}
          {subTab === 'notes' && (
            <div>
              <form onSubmit={handleCreateNote} style={{ marginBottom: 20, padding: 15, background: 'var(--bg)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                <input className="form-input" placeholder="Note Title" value={noteForm.title} onChange={e => setNoteForm({...noteForm, title: e.target.value})} style={{ flex: 1 }} />
                <input className="form-input" placeholder="Content (optional)" value={noteForm.content} onChange={e => setNoteForm({...noteForm, content: e.target.value})} style={{ flex: 2 }} />
                <button className="btn btn--outline" type="submit">Add Note</button>
              </form>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 15 }}>
                {notes.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No notes found.</p>}
                {notes.map(note => (
                  <div key={note._id} style={{ border: '1px solid var(--border)', background: '#fef3c7', color: '#92400e', borderRadius: 10, padding: 15, position: 'relative' }}>
                    <button onClick={() => handleDeleteNote(note._id)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#92400e' }}>
                      <i className="fa-solid fa-xmark" />
                    </button>
                    <div style={{ fontWeight: 600, marginBottom: 5, paddingRight: 15 }}>{note.title}</div>
                    {note.content && <div style={{ fontSize: '.85rem' }}>{note.content}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DECISIONS & INSTRUCTIONS */}
          {subTab === 'decisions-instructions' && (
            <div className="grid-2">
              <div className="hub-section">
                <h4>Team Decisions</h4>
                <form onSubmit={handleCreateDecision} style={{ marginBottom: 20, padding: 15, background: 'var(--bg)', borderRadius: 10 }}>
                  <input className="form-input" placeholder="Decision Title" value={decisionForm.title} onChange={e => setDecisionForm({...decisionForm, title: e.target.value})} style={{ marginBottom: 10 }} />
                  <textarea className="form-input" placeholder="Why and what was decided?" rows={3} value={decisionForm.description} onChange={e => setDecisionForm({...decisionForm, description: e.target.value})} style={{ marginBottom: 10 }} />
                  <button className="btn btn--outline btn--sm" type="submit">Record Decision</button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  {decisions.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No decisions recorded.</p>}
                  {decisions.map(dec => (
                    <div key={dec._id} style={{ border: '1px solid var(--border)', borderLeft: '4px solid var(--blue)', borderRadius: 8, padding: 15 }}>
                      <div style={{ fontWeight: 600, marginBottom: 5 }}>{dec.title}</div>
                      <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', margin: 0 }}>{dec.description}</p>
                      <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 10 }}>Decided on {new Date(dec.dateDecided).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hub-section">
                <h4>Instructions & Guidelines</h4>
                <form onSubmit={handleCreateInstruction} style={{ marginBottom: 20, padding: 15, background: 'var(--bg)', borderRadius: 10 }}>
                  <input className="form-input" placeholder="Instruction Title" value={instructionForm.title} onChange={e => setInstructionForm({...instructionForm, title: e.target.value})} style={{ marginBottom: 10 }} />
                  <textarea className="form-input" placeholder="Detailed content" rows={3} value={instructionForm.content} onChange={e => setInstructionForm({...instructionForm, content: e.target.value})} style={{ marginBottom: 10 }} />
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <select className="form-input" value={instructionForm.priority} onChange={e => setInstructionForm({...instructionForm, priority: e.target.value})}>
                      <option value="Normal">Normal Priority</option>
                      <option value="High">High Priority</option>
                    </select>
                  </div>
                  <button className="btn btn--outline btn--sm" type="submit">Post Instruction</button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  {instructions.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No instructions posted.</p>}
                  {instructions.map(inst => (
                    <div key={inst._id} style={{ border: '1px solid var(--border)', borderLeft: inst.priority === 'High' ? '4px solid var(--red)' : '4px solid var(--gray)', borderRadius: 8, padding: 15 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 600 }}>{inst.title}</div>
                        {inst.priority === 'High' && <span className="badge" style={{ color: 'var(--red)', background: 'var(--red-bg)' }}>High</span>}
                      </div>
                      <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>{inst.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}
