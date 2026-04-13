const fs = require('fs');
let content = fs.readFileSync('client/src/app/components/TopBar.tsx', 'utf8');

// Add useLocation
if (!content.includes('useLocation')) {
    content = content.replace(\"import { NavLink }\", \"import { NavLink, useLocation }\");
}

// Add map logic
const mapLogic = \
  const { currentUser } = useApp();
  const location = useLocation();
  
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/profile')) return 'My Profile';
    if (path.includes('/home')) return 'Dashboard';
    if (path.includes('/community')) return 'Community';
    if (path.includes('/office')) return 'Office Hub';
    if (path.includes('/my-tasks')) return 'My Tasks';
    if (path.includes('/projects')) return 'Projects';
    return 'Dashboard';
  };
\;

content = content.replace(/const { currentUser } = useApp\(\);/, mapLogic);
content = content.replace(/>My Profile<\/h1>/, \">{getPageTitle()}</h1>\");

fs.writeFileSync('client/src/app/components/TopBar.tsx', content, 'utf8');
