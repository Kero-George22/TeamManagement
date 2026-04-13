const fs = require('fs');

const files = [
  'client/src/app/pages/OfficeHubPage.tsx',
  'client/src/app/pages/CommunityPage.tsx',
  'client/src/app/pages/DiscoverPage.tsx',
  'client/src/app/pages/InboxPage.tsx',
  'client/src/app/pages/MyTasksPage.tsx',
  'client/src/app/pages/ProjectPage.tsx',
  'client/src/app/components/ui/Badges.tsx',
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Convert typical dark backgrounds
  content = content.replace(/bg-slate-[89]00/g, 'bg-white shadow-sm');
  content = content.replace(/bg-\[#262a2f\]/g, 'bg-white shadow-sm border border-gray-100');
  content = content.replace(/bg-\[#1d1f21\]/g, 'bg-white shadow-sm');
  content = content.replace(/bg-\[#(?:272727|2c3137|363636)\]/g, 'bg-gray-50');

  // Convert typical dark text colors
  content = content.replace(/text-slate-[12]00/g, 'text-gray-900 font-bold');
  content = content.replace(/text-slate-[34]00/g, 'text-gray-500');
  content = content.replace(/text-\[#(?:e7e9ec|EBEBEB)\]/g, 'text-gray-900');
  content = content.replace(/text-\[#(?:a3aab3|5E5E5E)\]/g, 'text-gray-500');

  // Convert borders
  content = content.replace(/border-slate-[78]00/g, 'border-gray-200');
  content = content.replace(/border-\[#363636\]/g, 'border-gray-100');

  fs.writeFileSync(file, content, 'utf8');
});

