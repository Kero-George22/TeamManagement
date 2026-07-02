import { useMemo, useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import API from '../../lib/api';
import { useToast } from '../../lib/toast';
import Badge from './Badge';

const EMPTY_PLAN_PROMPT = 'Plan the next best project execution path, balance work across members, and avoid duplicating existing tasks.';
const DEFAULT_MESSAGES = [
  { role: 'model', content: 'Ask me about risks, blockers, scope, or team priorities for this project.' },
];

function flattenPlan(plan) {
  return (plan?.phases || []).flatMap((phase) =>
    (phase.tasks || []).map((task) => ({
      ...task,
      phaseName: task.phaseName || phase.name,
    }))
  );
}

function selectedCount(plan) {
  return flattenPlan(plan).filter((task) => task.accepted !== false).length;
}

function getUserFromMember(member) {
  return member?.user || member?.userId || member;
}

function getMemberName(member) {
  const user = getUserFromMember(member);
  return user?.username || user?.email?.split('@')[0] || 'Member';
}

function compactDate(value) {
  if (!value) return 'No date';
  try {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
}

export default function AICopilotChat({
  projectId,
  project,
  members = [],
  onTasksCreated,
  isOwner = false,
}) {
  const toast = useToast();
  const [mode, setMode] = useState('plan');
  const [guidance, setGuidance] = useState('');
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [plannerStatus, setPlannerStatus] = useState('');

  const [messages, setMessages] = useState(DEFAULT_MESSAGES);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const endRef = useRef(null);
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef(null);

  const memberOptions = useMemo(() => {
    const seen = new Set();
    return members
      .map((member) => {
        const user = getUserFromMember(member);
        const id = user?._id || user?.id;
        if (!id || seen.has(String(id))) return null;
        seen.add(String(id));
        return {
          id: String(id),
          name: getMemberName(member),
          role: member.roleName || member.role || 'Member',
        };
      })
      .filter(Boolean);
  }, [members]);

  const roleOptions = useMemo(() => {
    const roles = new Set([
      ...(project?.rolesRequired || []).map((role) => role.roleName),
      ...members.map((member) => member.roleName || member.role),
      'Member',
    ].filter(Boolean));
    return [...roles];
  }, [project, members]);

  const selectedTasks = selectedCount(plan);
  const totalTasks = flattenPlan(plan).length;

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      setWorkspaceLoading(true);
      hydratedRef.current = false;
      try {
        const workspace = await API.tasks.aiWorkspace(projectId);
        if (cancelled) return;
        setMode(workspace?.mode === 'ask' ? 'ask' : 'plan');
        setGuidance(workspace?.guidance || '');
        setPlan(workspace?.plan || null);
        setPlannerStatus(workspace?.plannerStatus || '');
        setMessages(workspace?.messages?.length ? workspace.messages : DEFAULT_MESSAGES);
        hydratedRef.current = true;
      } catch (error) {
        if (!cancelled) toast.error(error.message || 'Failed to load AI workspace');
      } finally {
        if (!cancelled) setWorkspaceLoading(false);
      }
    }

    loadWorkspace();
    return () => {
      cancelled = true;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [projectId]);

  useEffect(() => {
    if (mode === 'ask') endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading, mode]);

  useEffect(() => {
    if (!hydratedRef.current || workspaceLoading) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        const payload = isOwner
          ? { mode, guidance, plan, plannerStatus, messages }
          : { mode, messages };
        await API.tasks.saveAIWorkspace(projectId, payload);
      } catch (error) {
        console.error('[AI workspace autosave] failed:', error);
      } finally {
        setSaving(false);
      }
    }, 700);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [projectId, isOwner, mode, guidance, plan, plannerStatus, messages, workspaceLoading]);

  async function handleGeneratePlan() {
    if (!isOwner) {
      toast.error('Only the project owner can generate and accept AI task plans.');
      return;
    }

    setPlanLoading(true);
    setPlannerStatus('');
    try {
      const nextPlan = await API.tasks.planPreview(projectId, guidance.trim() || EMPTY_PLAN_PROMPT);
      setPlan(nextPlan);
      setPlannerStatus('Review the suggestions, edit anything you want, then accept only the work you approve.');
      toast.success('AI plan ready for review');
    } catch (error) {
      toast.error(error.message || 'Failed to generate AI plan');
    } finally {
      setPlanLoading(false);
    }
  }

  function updateTask(clientId, updates) {
    setPlan((current) => {
      if (!current) return current;
      return {
        ...current,
        phases: current.phases.map((phase) => ({
          ...phase,
          tasks: phase.tasks.map((task) => (
            task.clientId === clientId ? { ...task, ...updates } : task
          )),
        })),
      };
    });
  }

  function setAllAccepted(accepted) {
    setPlan((current) => {
      if (!current) return current;
      return {
        ...current,
        phases: current.phases.map((phase) => ({
          ...phase,
          tasks: phase.tasks.map((task) => ({ ...task, accepted })),
        })),
      };
    });
  }

  async function handleAcceptPlan() {
    if (!plan || selectedTasks === 0) {
      toast.error('Select at least one task first');
      return;
    }

    setAccepting(true);
    try {
      const tasks = flattenPlan(plan);
      const created = await API.tasks.acceptPlan(projectId, tasks);
      toast.success(`${created.length || selectedTasks} tasks created and assigned`);
      const nextStatus = 'Approved tasks were created and assigned. They now appear on project and member task pages.';
      setPlannerStatus(nextStatus);
      await API.tasks.saveAIWorkspace(projectId, {
        mode,
        guidance,
        plan,
        plannerStatus: nextStatus,
        messages,
      });
      onTasksCreated?.(created);
    } catch (error) {
      toast.error(error.message || 'Failed to create tasks');
    } finally {
      setAccepting(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;

    const userMessage = input.trim();
    const nextMessages = [...messages, { role: 'user', content: userMessage, createdAt: new Date().toISOString() }];
    setInput('');
    setMessages(nextMessages);
    setChatLoading(true);

    try {
      const history = messages.slice(1).map((message) => ({
        role: message.role === 'user' ? 'user' : 'model',
        parts: [{ text: message.content }],
      }));

      const res = await API.ai.chat(projectId, userMessage, history);
      setMessages([...nextMessages, { role: 'model', content: res.reply, createdAt: new Date().toISOString() }]);
    } catch {
      setMessages([...nextMessages, { role: 'model', content: 'Sorry, I could not answer that. Please try again.', createdAt: new Date().toISOString() }]);
    } finally {
      setChatLoading(false);
    }
  }

  if (workspaceLoading) {
    return <div className="skeleton" style={{ height: 520, borderRadius: 'var(--card-radius)' }} />;
  }

  return (
    <section className="ai-workspace-page">
      <div className="ai-workspace-hero">
        <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <i className="fa-solid fa-diagram-project" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.35rem', lineHeight: 1.2 }}>AI Project Planner</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '.86rem', marginTop: 5 }}>
            Persistent project memory for plans, task suggestions, and AI conversations.
          </div>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '.8rem', minWidth: 86, textAlign: 'right' }}>
          {saving ? 'Saving...' : 'Saved'}
        </div>
      </div>

      <div className="workspace-tabs" style={{ marginTop: 16 }}>
        <button className={`workspace-tab ${mode === 'plan' ? 'active' : ''}`} onClick={() => setMode('plan')}>
          <i className="fa-solid fa-route" /> Visual Plan
        </button>
        <button className={`workspace-tab ${mode === 'ask' ? 'active' : ''}`} onClick={() => setMode('ask')}>
          <i className="fa-solid fa-comments" /> Conversation
        </button>
      </div>

      {mode === 'plan' ? (
        <div className="ai-planner-grid" style={{ marginTop: 16 }}>
          <section className="workspace-panel" style={{ margin: 0, overflow: 'hidden' }}>
            <div className="workspace-header">
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>Plan Brief</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Owner guidance and visual phase map.</div>
              </div>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea
                className="form-input"
                rows={5}
                value={guidance}
                onChange={(event) => setGuidance(event.target.value)}
                placeholder="Example: prioritize MVP launch, split frontend/backend tasks, and keep scope under two weeks."
                disabled={!isOwner || planLoading}
              />
              <button className="btn btn--blue" onClick={handleGeneratePlan} disabled={!isOwner || planLoading}>
                {planLoading ? <span className="spinner" /> : <i className="fa-solid fa-wand-magic-sparkles" />}
                Generate visual plan
              </button>
              {!isOwner && (
                <div style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>
                  You can view the plan and use the conversation. Only the owner can edit the plan or approve tasks.
                </div>
              )}
              {plannerStatus && (
                <div style={{ padding: 12, borderRadius: 8, background: 'var(--surface-hover)', color: 'var(--text-secondary)', fontSize: '.82rem', lineHeight: 1.45 }}>
                  {plannerStatus}
                </div>
              )}
            </div>

            {plan && (
              <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: '.9rem' }}>Timeline</div>
                  <Badge variant="blue">{selectedTasks}/{totalTasks} selected</Badge>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.phases.map((phase, index) => (
                    <div key={phase.id || phase.name} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'stretch' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '.78rem', fontWeight: 800 }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1, width: 2, background: index === plan.phases.length - 1 ? 'transparent' : 'var(--border)' }} />
                      </div>
                      <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, background: 'var(--surface)' }}>
                        <div style={{ fontWeight: 800, fontSize: '.86rem' }}>{phase.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '.76rem', marginTop: 4 }}>{compactDate(phase.startDate)} - {compactDate(phase.deadline)}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '.78rem', marginTop: 8, lineHeight: 1.4 }}>{phase.milestone}</div>
                        <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: 'var(--surface-hover)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.max(12, ((index + 1) / plan.phases.length) * 100)}%`, height: '100%', background: 'var(--blue)' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="workspace-panel" style={{ margin: 0, overflow: 'hidden' }}>
            <div className="workspace-header" style={{ alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>Suggested Tasks</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Edit, reject, or approve selected work. All edits autosave.</div>
              </div>
              {plan && isOwner && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button className="btn btn--ghost btn--sm" onClick={() => setAllAccepted(true)}>Select all</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setAllAccepted(false)}>Reject all</button>
                  <button className="btn btn--green btn--sm" onClick={handleAcceptPlan} disabled={accepting || selectedTasks === 0}>
                    {accepting ? <span className="spinner" /> : <i className="fa-solid fa-check" />}
                    Accept selected
                  </button>
                </div>
              )}
            </div>

            {!plan && (
              <div className="empty-state" style={{ minHeight: 360 }}>
                <i className="fa-solid fa-route" />
                <h4>No plan generated yet</h4>
                <p>Generate a plan to review phases and editable task suggestions before anything is created.</p>
              </div>
            )}

            {plan && (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <textarea
                  className="form-input"
                  rows={3}
                  value={plan.summary || ''}
                  disabled={!isOwner}
                  onChange={(event) => setPlan((current) => ({ ...(current || {}), summary: event.target.value }))}
                  aria-label="Plan summary"
                />

                {plan.phases.map((phase) => (
                  <div key={phase.id || phase.name} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        className="form-input"
                        value={phase.name}
                        disabled={!isOwner}
                        onChange={(event) => setPlan((current) => ({
                          ...current,
                          phases: current.phases.map((item) => item.id === phase.id ? { ...item, name: event.target.value } : item),
                        }))}
                        aria-label="Phase name"
                        style={{ fontWeight: 800 }}
                      />
                      <Badge variant="gray">{phase.tasks.filter((task) => task.accepted !== false).length}/{phase.tasks.length}</Badge>
                    </div>

                    {phase.tasks.map((task) => (
                      <div key={task.clientId} style={{
                        border: `1px solid ${task.accepted === false ? 'var(--border)' : 'var(--blue)'}`,
                        background: task.accepted === false ? 'var(--surface-hover)' : 'var(--surface)',
                        opacity: task.accepted === false ? 0.62 : 1,
                        borderRadius: 8,
                        padding: 12,
                        display: 'grid',
                        gap: 10,
                      }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '.82rem', minHeight: 32 }}>
                            <input
                              type="checkbox"
                              checked={task.accepted !== false}
                              disabled={!isOwner}
                              onChange={(event) => updateTask(task.clientId, { accepted: event.target.checked })}
                            />
                            {task.accepted === false ? 'Rejected' : 'Accepted'}
                          </label>
                          <div style={{ flex: 1 }} />
                          <Badge variant={task.priority === 'High' ? 'red' : task.priority === 'Low' ? 'green' : 'yellow'}>{task.priority}</Badge>
                        </div>

                        <input
                          className="form-input"
                          value={task.title}
                          disabled={!isOwner}
                          onChange={(event) => updateTask(task.clientId, { title: event.target.value })}
                          aria-label="Task title"
                        />
                        <textarea
                          className="form-input"
                          rows={3}
                          value={task.description}
                          disabled={!isOwner}
                          onChange={(event) => updateTask(task.clientId, { description: event.target.value })}
                          aria-label="Task description"
                        />

                        <div className="grid-2">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Role</label>
                            <select className="form-input" value={task.assignedRole} disabled={!isOwner} onChange={(event) => updateTask(task.clientId, { assignedRole: event.target.value })}>
                              {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                            </select>
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Assignee</label>
                            <select className="form-input" value={task.assigneeId || ''} disabled={!isOwner} onChange={(event) => updateTask(task.clientId, { assigneeId: event.target.value })}>
                              <option value="">Auto assign by role</option>
                              {memberOptions.map((member) => (
                                <option key={member.id} value={member.id}>{member.name} - {member.role}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="ai-task-meta-grid">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Start</label>
                            <input className="form-input" type="date" value={task.startDate || ''} disabled={!isOwner} onChange={(event) => updateTask(task.clientId, { startDate: event.target.value })} />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Deadline</label>
                            <input className="form-input" type="date" value={task.deadline || ''} disabled={!isOwner} onChange={(event) => updateTask(task.clientId, { deadline: event.target.value })} />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Points</label>
                            <input className="form-input" type="number" min="0" value={task.storyPoints || 0} disabled={!isOwner} onChange={(event) => updateTask(task.clientId, { storyPoints: event.target.value })} />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Priority</label>
                            <select className="form-input" value={task.priority} disabled={!isOwner} onChange={(event) => updateTask(task.clientId, { priority: event.target.value })}>
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="workspace-panel" style={{ marginTop: 16, overflow: 'hidden' }}>
          <div className="workspace-header">
            <div>
              <h3 className="section-title" style={{ marginBottom: 4 }}>Conversation</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Shared project AI memory. Messages are saved with this project.</div>
            </div>
          </div>
          <div style={{ height: 'min(560px, 58dvh)', overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((message, index) => (
              <div key={`${message.createdAt || index}-${index}`} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                <div style={{
                  background: message.role === 'user' ? 'var(--blue)' : 'var(--surface-hover)',
                  color: message.role === 'user' ? '#fff' : 'var(--text)',
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: '.9rem',
                  lineHeight: 1.5,
                }}>
                  {message.role === 'model' ? (
                    <div className="markdown-body" style={{ background: 'transparent', fontSize: '.9rem' }}>
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : message.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '.85rem' }}>
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
                placeholder="Ask about project risks, tasks, or priorities..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <button
                type="submit"
                className="btn btn--blue"
                style={{ width: 42, height: 42, borderRadius: '50%', padding: 0, display: 'grid', placeItems: 'center' }}
                disabled={!input.trim() || chatLoading}
                aria-label="Send message"
              >
                <i className="fa-solid fa-paper-plane" />
              </button>
            </form>
          </div>
        </section>
      )}
    </section>
  );
}
