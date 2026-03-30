import type { CVData } from '@/types';

export const premiumCvDummyData: CVData = {
  full_name: 'Alex Morgan',
  professional_title: 'Senior Frontend Engineer',
  email: 'alex@example.com',
  phone: '+1 555 010 190',
  location: 'San Francisco, CA',
  linkedin_url: 'https://linkedin.com/in/alexmorgan',
  portfolio_url: 'https://alexmorgan.dev',
  website_url: 'https://alexmorgan.dev',
  address: null,
  photo_url: null,
  summary:
    'Product-focused frontend engineer with 8+ years building high-conversion SaaS experiences. Specialized in React, design systems, and performance optimization.',
  experience: [
    {
      id: 'exp_1',
      company: 'NovaCloud',
      title: 'Senior Frontend Engineer | 2021 - Present',
      location: 'Remote',
      start_date: '2021-01',
      end_date: null,
      is_current: true,
      bullets: [
        'Led migration to a component-driven architecture that reduced UI defects by 34%.',
        'Improved onboarding conversion from 21% to 33% by redesigning activation flow.',
      ],
      description: null,
    },
  ],
  education: [],
  skills: [{ id: 'skills_1', category: 'technical', items: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'] }],
  projects: [],
  certifications: [],
  languages: [],
  awards: [],
  referrals: [],
};
