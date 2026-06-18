export const projectTemplates = [
  {
    id: 'saas-mvp',
    title: 'SaaS MVP Development',
    description: 'A comprehensive plan for building a Minimum Viable Product for a Software-as-a-Service business. Includes planning, frontend, backend, and deployment phases.',
    category: 'Software Engineering',
    duration: 60,
    rolesRequired: [
      { roleName: 'Frontend Engineer', totalSlots: 2 },
      { roleName: 'Backend Engineer', totalSlots: 1 },
      { roleName: 'Product Manager', totalSlots: 1 },
      { roleName: 'UI/UX Designer', totalSlots: 1 }
    ],
    taskStatuses: ['Todo', 'In-Progress', 'Review', 'Testing', 'Done'],
    features: ['Authentication', 'Database Setup', 'Landing Page', 'Subscription Billing', 'Dashboard']
  },
  {
    id: 'mobile-app',
    title: 'iOS & Android Mobile App',
    description: 'End-to-end development of a cross-platform mobile application using React Native or Flutter.',
    category: 'Mobile Development',
    duration: 90,
    rolesRequired: [
      { roleName: 'Mobile Developer', totalSlots: 2 },
      { roleName: 'Backend Engineer', totalSlots: 1 },
      { roleName: 'QA Tester', totalSlots: 1 },
      { roleName: 'UI/UX Designer', totalSlots: 1 }
    ],
    taskStatuses: ['Todo', 'In-Progress', 'Review', 'QA', 'Done', 'Approved'],
    features: ['App Store Deployment', 'Push Notifications', 'Offline Mode', 'API Integration']
  },
  {
    id: 'ecommerce',
    title: 'E-Commerce Platform',
    description: 'Launch a modern e-commerce platform with product catalogs, shopping cart, checkout, and inventory management.',
    category: 'Web Development',
    duration: 45,
    rolesRequired: [
      { roleName: 'Fullstack Developer', totalSlots: 2 },
      { roleName: 'Marketing Specialist', totalSlots: 1 },
      { roleName: 'UI/UX Designer', totalSlots: 1 }
    ],
    taskStatuses: ['Todo', 'In-Progress', 'Review', 'Done'],
    features: ['Payment Gateway integration', 'Product Management', 'Admin Panel', 'Order Tracking']
  },
  {
    id: 'marketing-campaign',
    title: 'Digital Marketing Campaign',
    description: 'Plan, execute, and analyze a comprehensive digital marketing campaign across multiple channels.',
    category: 'Marketing',
    duration: 30,
    rolesRequired: [
      { roleName: 'Marketing Manager', totalSlots: 1 },
      { roleName: 'Content Creator', totalSlots: 2 },
      { roleName: 'SEO Specialist', totalSlots: 1 },
      { roleName: 'Data Analyst', totalSlots: 1 }
    ],
    taskStatuses: ['Planning', 'Drafting', 'Review', 'Scheduled', 'Published'],
    features: ['SEO Audit', 'Content Calendar', 'Ad Campaign Setup', 'Performance Reporting']
  },
  {
    id: 'game-development',
    title: 'Indie Game Development (Unity/Unreal)',
    description: 'A structured roadmap for developing an indie game from concept to alpha release.',
    category: 'Game Development',
    duration: 120,
    rolesRequired: [
      { roleName: 'Game Developer', totalSlots: 2 },
      { roleName: '3D Artist', totalSlots: 1 },
      { roleName: 'Sound Designer', totalSlots: 1 },
      { roleName: 'Game Designer', totalSlots: 1 }
    ],
    taskStatuses: ['Backlog', 'In-Progress', 'Playtesting', 'Polishing', 'Done'],
    features: ['Core Gameplay Loop', 'Level Design', 'Audio Integration', 'Alpha Build']
  },
  {
    id: 'data-pipeline',
    title: 'Data Engineering Pipeline',
    description: 'Setup an automated ETL pipeline, data warehouse, and business intelligence dashboards.',
    category: 'Data Science',
    duration: 45,
    rolesRequired: [
      { roleName: 'Data Engineer', totalSlots: 2 },
      { roleName: 'Data Analyst', totalSlots: 1 },
      { roleName: 'DevOps Engineer', totalSlots: 1 }
    ],
    taskStatuses: ['Todo', 'In-Progress', 'Testing', 'Deployed'],
    features: ['ETL Automation', 'Data Lake Setup', 'BI Dashboard', 'Data Quality Checks']
  },
  {
    id: 'rebrand',
    title: 'Corporate Rebranding',
    description: 'Complete overhaul of company brand identity including logo, guidelines, website, and marketing materials.',
    category: 'Design',
    duration: 60,
    rolesRequired: [
      { roleName: 'Art Director', totalSlots: 1 },
      { roleName: 'Graphic Designer', totalSlots: 2 },
      { roleName: 'Copywriter', totalSlots: 1 },
      { roleName: 'Web Developer', totalSlots: 1 }
    ],
    taskStatuses: ['Concept', 'Drafting', 'Client Review', 'Revisions', 'Finalized'],
    features: ['Logo Design', 'Brand Guidelines', 'Website Redesign', 'Social Media Assets']
  },
  {
    id: 'ai-integration',
    title: 'AI Feature Integration',
    description: 'Integrate LLMs and GenAI features into an existing application, including prompts, RAG, and monitoring.',
    category: 'Artificial Intelligence',
    duration: 30,
    rolesRequired: [
      { roleName: 'AI Engineer', totalSlots: 1 },
      { roleName: 'Backend Developer', totalSlots: 1 },
      { roleName: 'Frontend Developer', totalSlots: 1 }
    ],
    taskStatuses: ['Todo', 'In-Progress', 'Review', 'Evaluating', 'Done'],
    features: ['Prompt Engineering', 'Vector DB Setup', 'RAG Pipeline', 'Rate Limiting']
  }
];
