const fs = require('fs');
let content = fs.readFileSync('client/src/app/pages/HomePage.tsx', 'utf8');

content = content.replace(/bg-\[\#272727\]/g, 'bg-white shadow-sm');
content = content.replace(/bg-transparent/g, 'bg-white shadow-sm border border-gray-100'); // sometimes tasks have this
content = content.replace(/border border-\[\#363636\]/g, '');
content = content.replace(/border-\[\#363636\]/g, 'border-gray-100');
content = content.replace(/text-\[\#EBEBEB\]/g, 'text-gray-900');
content = content.replace(/text-\[\#5E5E5E\]/g, 'text-gray-500');

content = content.replace(/backgroundColor:\s*'#2F2F2F'/g, "backgroundColor: 'white'");
content = content.replace(/border:\s*'1px solid #363636'/g, "border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'");
content = content.replace(/color:\s*'#EBEBEB'/g, "color: '#1f2937'");
content = content.replace(/stroke=\"#363636\"/g, "stroke='#e5e7eb'");
content = content.replace(/fill:\s*'#2F2F2F'/g, "fill: '#f3f4f6'");

content = content.replace(/STATUS_COLORS\['No data'\]\s*=\s*'#363636';/g, "STATUS_COLORS['No data'] = '#e5e7eb';");
content = content.replace(/rounded-xl/g, 'rounded-[20px]');
content = content.replace(/text-xl text-gray-900/g, 'text-2xl font-bold text-gray-900');
content = content.replace(/text-\[\#8f969f\]/g, 'text-gray-500');

fs.writeFileSync('client/src/app/pages/HomePage.tsx', content, 'utf8');
