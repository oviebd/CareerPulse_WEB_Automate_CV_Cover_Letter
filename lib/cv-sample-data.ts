import type { CVData } from '@/types';

/** Static content for template gallery thumbnails (no user data). */
export function getSampleCVData(accentColor = '#2563EB'): CVData {
  return {
    full_name: 'Alex Morgan',
    professional_title: 'Senior Product Designer',
    email: 'alex.morgan@email.com',
    phone: '+1 415 555 0192',
    location: 'San Francisco, CA',
    linkedin_url: 'linkedin.com/in/alexmorgan',
    portfolio_url: null,
    website_url: null,
    summary:
      'Product designer with 8+ years shipping B2B SaaS. Focused on research-led UX, design systems, and cross-functional delivery.',
    experience: [
      {
        id: 's1',
        company: 'Northwind Labs',
        title: 'Lead Product Designer',
        location: 'Remote',
        start_date: '2021-03',
        end_date: null,
        is_current: true,
        bullets: [
          'Owned end-to-end UX for the analytics suite used by 40k+ weekly active users.',
          'Built and maintained a Figma design system adopted across 6 product squads.',
          'Partnered with PM and engineering to reduce time-to-ship for major releases by ~25%.',
        ],
        description: null,
      },
      {
        id: 's2',
        company: 'Acme Studio',
        title: 'Product Designer',
        location: 'New York, NY',
        start_date: '2017-06',
        end_date: '2021-02',
        is_current: false,
        bullets: [
          'Led redesign of onboarding; improved activation by 18% in two quarters.',
          'Conducted usability studies and translated insights into prioritized roadmaps.',
        ],
        description: null,
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'State University',
        degree: "Bachelor's",
        field_of_study: 'Human–Computer Interaction',
        start_date: '2011-09',
        end_date: '2015-05',
        gpa: null,
        description: null,
      },
    ],
    skills: [
      {
        id: 'sk1',
        category: 'technical',
        items: ['UX research', 'UI design', 'Design systems', 'Prototyping'],
      },
      {
        id: 'sk2',
        category: 'tools',
        items: ['Figma', 'FigJam', 'Maze', 'Notion'],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Design tokens toolkit',
        description: 'Open-source Figma plugin for syncing tokens with code repos.',
        tech_stack: ['TypeScript', 'Figma API'],
        url: null,
        start_date: '2023-01',
        end_date: null,
      },
    ],
    certifications: [],
    languages: [
      { id: 'l1', language: 'English', proficiency: 'native' },
      { id: 'l2', language: 'Spanish', proficiency: 'intermediate' },
    ],
    awards: [],
    accent_color: accentColor,
    watermark: false,
  };
}
