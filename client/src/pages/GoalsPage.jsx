import { useState, useEffect } from 'react';
import Topbar from '../components/layout/Topbar';
import Badge from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';

const KANBAN_COLORS = ['blue', 'purple', 'red', 'orange', 'green', 'pink'];

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('user_goals');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Master React & Vite', description: 'Become an expert in building modern interfaces.', completed: false, color: 'blue' },
      { id: '2', title: 'Build a stunning SaaS project', description: 'Use Asana-style bento grids and pastel aesthetics.', completed: false, color: 'purple' },
      { id: '3', title: 'Achieve work-life flow', description: 'Rest well to work well.', completed: true, color: 'green' },
    ];
  });
  
  const [newGoalId, setNewGoalId] = useState(null);

  useEffect(() => {
    localStorage.setItem('user_goals', JSON.stringify(goals));
  }, [goals]);

  const addGoal = () => {
    const id = Date.now().toString();
    const newGoal = {
      id,
      title: '',
      description: '',
      completed: false,
      color: KANBAN_COLORS[Math.floor(Math.random() * KANBAN_COLORS.length)]
    };
    setGoals([newGoal, ...goals]);
    setNewGoalId(id);
  };

  const updateGoal = (id, updates) => {
    setGoals(goals.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const toggleGoal = (id) => {
    setGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const deleteGoal = (id) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Topbar title="My Goals" />
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--primary" onClick={addGoal} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-plus" /> New Goal
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* ACTIVE GOALS */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Active Goals</h2>
            <Badge variant="gray">{activeGoals.length}</Badge>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {activeGoals.map(goal => (
              <GoalCard 
                key={goal.id} goal={goal} 
                isNew={newGoalId === goal.id}
                onUpdate={(updates) => updateGoal(goal.id, updates)}
                onToggle={() => toggleGoal(goal.id)}
                onDelete={() => deleteGoal(goal.id)}
              />
            ))}
            {activeGoals.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1', padding: 40 }}>
                No active goals. Time to set some new milestones!
              </div>
            )}
          </div>
        </section>

        {/* COMPLETED GOALS */}
        {completedGoals.length > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-muted)' }}>Completed</h2>
              <Badge variant="gray">{completedGoals.length}</Badge>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {completedGoals.map(goal => (
                <GoalCard 
                  key={goal.id} goal={goal} 
                  onUpdate={(updates) => updateGoal(goal.id, updates)}
                  onToggle={() => toggleGoal(goal.id)}
                  onDelete={() => deleteGoal(goal.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function GoalCard({ goal, isNew, onUpdate, onToggle, onDelete }) {
  const col = goal.completed ? 'gray' : goal.color;
  
  return (
    <div className={`card`} style={{ 
      display: 'flex', flexDirection: 'column', gap: 16, padding: 20, 
      borderTop: `4px solid var(--${col === 'gray' ? 'border' : col})`,
      opacity: goal.completed ? 0.6 : 1,
      transition: 'all .2s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12, flex: 1, alignItems: 'flex-start' }}>
          <button 
            onClick={onToggle}
            style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              border: `2px solid var(--${col === 'gray' ? 'border' : col})`,
              background: goal.completed ? 'var(--border)' : 'transparent',
              color: goal.completed ? '#fff' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all .2s', marginTop: 2
            }}
          >
            <i className="fa-solid fa-check" style={{ fontSize: '.8rem' }} />
          </button>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isNew || !goal.title ? (
               <input 
                 autoFocus
                 type="text" 
                 placeholder="Goal title..." 
                 value={goal.title} 
                 onChange={e => onUpdate({ title: e.target.value })}
                 style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '1.05rem', fontWeight: 800, width: '100%', color: 'var(--text)' }}
               />
            ) : (
              <input 
                 type="text"
                 value={goal.title} 
                 onChange={e => onUpdate({ title: e.target.value })}
                 style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '1.05rem', fontWeight: 800, width: '100%', color: 'var(--text)', textDecoration: goal.completed ? 'line-through' : 'none' }}
              />
            )}
            
            <textarea
              placeholder="Add description..."
              value={goal.description}
              onChange={e => onUpdate({ description: e.target.value })}
              style={{
                border: 'none', outline: 'none', background: 'transparent', fontSize: '.85rem', fontWeight: 500, width: '100%', color: 'var(--text-secondary)',
                resize: 'none', minHeight: 40, fontFamily: 'inherit', padding: 0
              }}
            />
          </div>
        </div>
        
        <button className="icon-btn" onClick={onDelete} style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-trash-can" />
        </button>
      </div>
      
      {!goal.completed && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', fontWeight: 700, color: `var(--${col})`, filter: 'brightness(0.7)' }}>
            <span>Milestone Progress</span>
            <span>{Math.floor(Math.abs(goal.id.slice(-2)) % 100) || 50}%</span>
          </div>
          <div className="progress" style={{ background: 'var(--border)', height: 6, width: '100%', borderRadius: 99, overflow: 'hidden' }}>
            <div className="progress__fill" style={{ width: `${Math.floor(Math.abs(goal.id.slice(-2)) % 100) || 50}%`, background: `var(--${col})`, height: '100%' }} />
          </div>
        </>
      )}
    </div>
  );
}
