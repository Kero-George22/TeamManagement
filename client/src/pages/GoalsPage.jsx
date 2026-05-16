import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import Badge from '../components/ui/Badge';
import API from '../lib/api';
import { useToast } from '../lib/toast';
import { useGlobalProject } from '../contexts/ProjectContext';

const KANBAN_COLORS = ['blue', 'purple', 'red', 'orange', 'green', 'pink'];

function goalId(goal) {
  return goal._id || goal.id;
}

export default function GoalsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { projects } = useGlobalProject();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGoalId, setNewGoalId] = useState(null);
  const patchTimers = useRef({});

  const loadGoals = useCallback(async () => {
    try {
      let list = await API.goals.list();
      const localRaw = localStorage.getItem('user_goals');
      if (list.length === 0 && localRaw) {
        try {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const result = await API.goals.importLocal(parsed);
            list = result?.goals || list;
            localStorage.removeItem('user_goals');
            toast.success('Goals migrated from this device');
          }
        } catch {
          /* ignore bad local data */
        }
      }
      setGoals(list);
    } catch {
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  useEffect(() => () => {
    Object.values(patchTimers.current).forEach(clearTimeout);
  }, []);

  const scheduleUpdate = (id, updates) => {
    setGoals((prev) => prev.map((g) => (goalId(g) === id ? { ...g, ...updates } : g)));
    clearTimeout(patchTimers.current[id]);
    patchTimers.current[id] = setTimeout(async () => {
      if (updates.title !== undefined && !String(updates.title).trim()) return;
      try {
        const updated = await API.goals.update(id, updates);
        setGoals((prev) => prev.map((g) => (goalId(g) === id ? { ...g, ...updated } : g)));
      } catch (e) {
        toast.error(e.message || 'Failed to save goal');
        loadGoals();
      }
    }, 450);
  };

  const addGoal = async () => {
    try {
      const goal = await API.goals.create({
        title: 'New goal',
        description: '',
        color: KANBAN_COLORS[Math.floor(Math.random() * KANBAN_COLORS.length)],
        progress: 10,
      });
      setGoals((prev) => [goal, ...prev]);
      setNewGoalId(goalId(goal));
    } catch (e) {
      toast.error(e.message || 'Failed to create goal');
    }
  };

  const toggleGoal = async (id, completed) => {
    try {
      const updated = await API.goals.update(id, { completed: !completed });
      setGoals((prev) => prev.map((g) => (goalId(g) === id ? { ...g, ...updated } : g)));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const deleteGoal = async (id) => {
    try {
      await API.goals.remove(id);
      setGoals((prev) => prev.filter((g) => goalId(g) !== id));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  if (loading) {
    return (
      <>
        <Topbar title="My Goals" />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--card-radius)' }} />
      </>
    );
  }

  return (
    <>
      <Topbar title="My Goals" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button type="button" className="btn btn--primary" onClick={addGoal} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-plus" /> New Goal
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Active Goals</h2>
            <Badge variant="gray">{activeGoals.length}</Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {activeGoals.map((goal) => (
              <GoalCard
                key={goalId(goal)}
                goal={goal}
                projects={projects || []}
                isNew={newGoalId === goalId(goal)}
                onUpdate={(updates) => scheduleUpdate(goalId(goal), updates)}
                onToggle={() => toggleGoal(goalId(goal), goal.completed)}
                onDelete={() => deleteGoal(goalId(goal))}
                onOpenProject={(pid) => navigate(`/app/project/${pid}`)}
              />
            ))}
            {activeGoals.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1', padding: 40 }}>
                No active goals. Time to set some new milestones!
              </div>
            )}
          </div>
        </section>

        {completedGoals.length > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-muted)' }}>Completed</h2>
              <Badge variant="gray">{completedGoals.length}</Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {completedGoals.map((goal) => (
                <GoalCard
                  key={goalId(goal)}
                  goal={goal}
                  projects={projects || []}
                  onUpdate={(updates) => scheduleUpdate(goalId(goal), updates)}
                  onToggle={() => toggleGoal(goalId(goal), goal.completed)}
                  onDelete={() => deleteGoal(goalId(goal))}
                  onOpenProject={(pid) => navigate(`/app/project/${pid}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function GoalCard({ goal, projects, isNew, onUpdate, onToggle, onDelete, onOpenProject }) {
  const col = goal.completed ? 'gray' : goal.color || 'blue';
  const progress = goal.progress ?? 0;
  const projectId = goal.project?._id || goal.project;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 20,
        borderTop: `4px solid var(--${col === 'gray' ? 'border' : col})`,
        opacity: goal.completed ? 0.6 : 1,
        transition: 'all .2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12, flex: 1, alignItems: 'flex-start' }}>
          <button
            type="button"
            onClick={onToggle}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              flexShrink: 0,
              border: `2px solid var(--${col === 'gray' ? 'border' : col})`,
              background: goal.completed ? 'var(--border)' : 'transparent',
              color: goal.completed ? '#fff' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginTop: 2,
            }}
          >
            <i className="fa-solid fa-check" style={{ fontSize: '.8rem' }} />
          </button>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              autoFocus={isNew}
              type="text"
              placeholder="Goal title..."
              value={goal.title || ''}
              onChange={(e) => onUpdate({ title: e.target.value })}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '1.05rem',
                fontWeight: 800,
                width: '100%',
                color: 'var(--text)',
                textDecoration: goal.completed ? 'line-through' : 'none',
              }}
            />

            <textarea
              placeholder="Add description..."
              value={goal.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '.85rem',
                width: '100%',
                color: 'var(--text-secondary)',
                resize: 'none',
                minHeight: 40,
                fontFamily: 'inherit',
                padding: 0,
              }}
            />

            {projects.length > 0 && (
              <select
                className="form-input"
                value={projectId || ''}
                onChange={(e) => onUpdate({ projectId: e.target.value || null })}
                style={{ fontSize: '.8rem', padding: '6px 10px' }}
              >
                <option value="">Link to project (optional)</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}

            {goal.project?.title && projectId && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ alignSelf: 'flex-start', padding: '4px 8px' }}
                onClick={() => onOpenProject(projectId)}
              >
                <i className="fa-solid fa-folder-open" /> {goal.project.title}
              </button>
            )}
          </div>
        </div>

        <button type="button" className="icon-btn" onClick={onDelete} style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-trash-can" />
        </button>
      </div>

      {!goal.completed && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '.75rem',
              fontWeight: 700,
              color: `var(--${col})`,
              filter: 'brightness(0.7)',
            }}
          >
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => onUpdate({ progress: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div className="progress" style={{ background: 'var(--border)', height: 6, width: '100%', borderRadius: 99, overflow: 'hidden' }}>
            <div
              className="progress__fill"
              style={{ width: `${progress}%`, background: `var(--${col})`, height: '100%' }}
            />
          </div>
        </>
      )}
    </div>
  );
}
