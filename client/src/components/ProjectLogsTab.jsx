import React, { useState, useEffect } from 'react';
import API from '../lib/api';

const ProjectLogsTab = ({ projectId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  const [filterAction, setFilterAction] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');

  const fetchLogs = async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await API.projects.logs(projectId, {
        page: pageNum,
        limit: 20,
        action: filterAction,
        entityType: filterEntityType,
      });

      if (append) {
        setLogs(prev => [...prev, ...(res.logs || [])]);
      } else {
        setLogs(res.logs || []);
      }
      
      setTotalPages(res.totalPages || 1);
      setHasMore(pageNum < (res.totalPages || 1));
      setPage(pageNum);
    } catch (err) {
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, false);
  }, [projectId, filterAction, filterEntityType]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchLogs(page + 1, true);
    }
  };

  return (
    <div className="logs-tab-container">
      <div className="logs-header">
        <h3>Activity Logs</h3>
        <p className="logs-subtitle">Track important actions within the project.</p>
        
        <div className="logs-filters">
          <select 
            value={filterEntityType} 
            onChange={(e) => setFilterEntityType(e.target.value)}
            className="logs-select"
          >
            <option value="">All Entity Types</option>
            <option value="project">Project</option>
            <option value="member">Members</option>
            <option value="joinRequest">Join Requests</option>
            <option value="permissions">Permissions</option>
            <option value="status">Task Statuses</option>
          </select>
          
          <input 
            type="text" 
            placeholder="Filter by action (e.g. 'project updated')" 
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="logs-input"
          />
        </div>
      </div>

      {error && <div className="logs-error">{error}</div>}

      <div className="logs-timeline">
        {logs.length === 0 && !loading && !error && (
          <div className="logs-empty">No logs found matching your criteria.</div>
        )}
        
        {logs.map(log => (
          <div key={log._id} className="log-card">
            <div className="log-avatar">
              {log.actor?.avatar ? (
                <img src={log.actor.avatar} alt="Avatar" />
              ) : (
                <div className="log-avatar-placeholder">
                  {log.actor?.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div className="log-content">
              <div className="log-meta">
                <span className="log-actor">{log.actor?.username || 'Unknown User'}</span>
                <span className="log-time">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
              <div className="log-message">
                {log.message}
              </div>
              <div className="log-badges">
                <span className="log-badge log-badge-action">{log.action}</span>
                <span className="log-badge log-badge-entity">{log.entityType}</span>
                {log.entityTitle && (
                  <span className="log-badge log-badge-title">"{log.entityTitle}"</span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {loading && <div className="logs-loading">Loading...</div>}
        
        {!loading && hasMore && (
          <button className="logs-load-more" onClick={handleLoadMore}>
            Load More
          </button>
        )}
      </div>

      <style>{`
        .logs-tab-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .logs-header h3 {
          margin: 0 0 0.5rem;
          color: var(--text-primary, #fff);
        }
        .logs-subtitle {
          color: var(--text-secondary, #aaa);
          margin: 0 0 1rem;
          font-size: 0.9rem;
        }
        .logs-filters {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .logs-select, .logs-input {
          background: var(--bg-secondary, #1e1e1e);
          border: 1px solid var(--border-color, #333);
          color: var(--text-primary, #fff);
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          outline: none;
          min-width: 200px;
        }
        .logs-select:focus, .logs-input:focus {
          border-color: var(--accent-primary, #4ade80);
        }
        .logs-error {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          padding: 0.75rem;
          border-radius: 4px;
        }
        .logs-empty {
          color: var(--text-secondary, #aaa);
          padding: 2rem;
          text-align: center;
          background: var(--bg-secondary, #1e1e1e);
          border-radius: 8px;
          border: 1px dashed var(--border-color, #333);
        }
        .logs-timeline {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .log-card {
          display: flex;
          gap: 1rem;
          background: var(--bg-secondary, #1e1e1e);
          border: 1px solid var(--border-color, #333);
          padding: 1rem;
          border-radius: 8px;
        }
        .log-avatar img, .log-avatar-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        .log-avatar-placeholder {
          background: var(--accent-primary, #4ade80);
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1.2rem;
        }
        .log-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }
        .log-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
        }
        .log-actor {
          font-weight: 600;
          color: var(--text-primary, #fff);
        }
        .log-time {
          color: var(--text-secondary, #aaa);
        }
        .log-message {
          color: var(--text-primary, #ddd);
          font-size: 0.95rem;
          line-height: 1.4;
        }
        .log-badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 0.25rem;
        }
        .log-badge {
          font-size: 0.75rem;
          padding: 0.15rem 0.5rem;
          border-radius: 12px;
          background: rgba(255,255,255,0.1);
          color: var(--text-secondary, #aaa);
        }
        .log-badge-action {
          background: rgba(74, 222, 128, 0.1);
          color: #4ade80;
          border: 1px solid rgba(74, 222, 128, 0.2);
        }
        .log-badge-entity {
          background: rgba(96, 165, 250, 0.1);
          color: #60a5fa;
          border: 1px solid rgba(96, 165, 250, 0.2);
        }
        .logs-loading {
          text-align: center;
          color: var(--text-secondary, #aaa);
          padding: 1rem;
        }
        .logs-load-more {
          background: transparent;
          border: 1px solid var(--border-color, #333);
          color: var(--text-primary, #fff);
          padding: 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .logs-load-more:hover {
          background: var(--bg-hover, #2a2a2a);
        }
      `}</style>
    </div>
  );
};

export default ProjectLogsTab;
