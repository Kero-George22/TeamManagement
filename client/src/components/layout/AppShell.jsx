import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppShell() {
  const location = useLocation();

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <Outlet key={location.pathname} />
      </main>
    </div>
  );
}
