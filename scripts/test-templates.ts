import { writeFile } from 'fs/promises';
import path from 'path';
import {
  closePdfBrowser,
  generatePDF,
  renderTemplate,
} from '@/lib/pdf';
import type { CVData } from '@/types';

const testCVData: CVData = {
  full_name: 'Alexandra Chen',
  professional_title: 'Senior Product Manager',
  email: 'alex.chen@email.com',
  phone: '+1 (415) 555-0192',
  location: 'San Francisco, CA',
  linkedin_url: 'https://linkedin.com/in/alexandrachen',
  portfolio_url: 'https://alexandrachen.com',
  website_url: null,
  address: null,
  photo_url: null,
  summary:
    'Product leader with 8 years of experience building B2B SaaS products from 0 to 1 and scaling them to $50M ARR. Specializes in AI-powered products, developer tools, and complex enterprise workflows. Previously at Stripe, Notion, and two YC startups.',
  experience: [
    {
      id: 'exp_1',
      company: 'Notion',
      title: 'Senior Product Manager — AI Features',
      location: 'San Francisco, CA',
      start_date: '2022-03',
      end_date: null,
      is_current: true,
      bullets: [
        'Led the 0-to-1 launch of Notion AI, now used by 4M+ users and generating $30M ARR',
        'Defined product strategy, roadmap, and pricing across 3 AI product lines',
        'Managed a cross-functional team of 12 (engineering, design, data science, marketing)',
        'Reduced time-to-value for new users by 60% through AI-powered onboarding flows',
      ],
      description: null,
    },
    {
      id: 'exp_2',
      company: 'Stripe',
      title: 'Product Manager — Developer Experience',
      location: 'San Francisco, CA',
      start_date: '2019-06',
      end_date: '2022-02',
      is_current: false,
      bullets: [
        "Owned Stripe's API documentation platform, used by 2M+ developers monthly",
        'Shipped the Stripe CLI 2.0, increasing developer activation rate by 35%',
        'Led integration of AI-assisted error debugging — reduced average time-to-resolution by 4 hours',
      ],
      description: null,
    },
    {
      id: 'exp_3',
      company: 'Segment (YC S11)',
      title: 'Associate Product Manager',
      location: 'San Francisco, CA',
      start_date: '2017-08',
      end_date: '2019-05',
      is_current: false,
      bullets: [
        'Managed the data pipeline product used by 500+ enterprise customers',
        'Launched integrations marketplace from 0 to 200 integrations in 18 months',
      ],
      description: null,
    },
  ],
  education: [
    {
      id: 'edu_1',
      institution: 'UC Berkeley',
      degree: "Bachelor's",
      field_of_study: 'Computer Science & Business Administration',
      start_date: '2013-08',
      end_date: '2017-05',
      gpa: '3.9',
      description: null,
    },
  ],
  skills: [
    {
      id: 'skill_1',
      category: 'technical',
      items: [
        'SQL',
        'Python',
        'A/B Testing',
        'Data Analysis',
        'API Design',
        'Figma',
      ],
    },
    {
      id: 'skill_2',
      category: 'soft',
      items: [
        'Strategic thinking',
        'Cross-functional leadership',
        'Executive communication',
        'Roadmap planning',
      ],
    },
    {
      id: 'skill_3',
      category: 'tools',
      items: ['Jira', 'Amplitude', 'Mixpanel', 'Notion', 'Linear', 'Slack'],
    },
  ],
  projects: [
    {
      id: 'proj_1',
      name: 'OpenPM — Open Source PM Templates',
      description:
        "Built and maintain a collection of product management templates used by 8,000+ PMs. Featured in Product Hunt's top products of 2023.",
      tech_stack: ['Next.js', 'Notion API', 'Vercel'],
      url: 'https://openpm.dev',
      start_date: '2023-01',
      end_date: null,
    },
  ],
  certifications: [
    {
      id: 'cert_1',
      name: 'Certified Scrum Product Owner (CSPO)',
      issuer: 'Scrum Alliance',
      issue_date: '2020-03',
      expiry_date: null,
      url: null,
    },
  ],
  languages: [
    { id: 'lang_1', language: 'English', proficiency: 'native' },
    { id: 'lang_2', language: 'Mandarin', proficiency: 'fluent' },
  ],
  awards: [
    {
      id: 'award_1',
      title: 'Product Leader of the Year',
      issuer: 'ProductCon 2023',
      date: '2023-11',
      description: null,
    },
  ],
  referrals: [],
  accent_color: '#6C63FF',
  watermark: false,
};

const TEMPLATE_IDS = [
  'classic',
  'minimal',
  'sidebar',
  'bold-header',
  'two-column',
  'executive',
  'apex',
  'nova',
] as const;

async function main() {
  const rows: { id: string; kb: string; ms: number }[] = [];
  for (const templateId of TEMPLATE_IDS) {
    const t0 = Date.now();
    const html = renderTemplate(templateId, testCVData);
    const pdf = await generatePDF(html);
    const outPath = path.join('/tmp', `test-${templateId}.pdf`);
    await writeFile(outPath, pdf);
    const ms = Date.now() - t0;
    const kb = (pdf.length / 1024).toFixed(1);
    rows.push({ id: templateId, kb, ms });
    console.log(`✓ ${templateId} — ${kb}KB — ${ms}ms`);
  }
  await closePdfBrowser();
  console.log('\nSummary');
  console.log('template\t\tKB\tms');
  for (const r of rows) {
    console.log(`${r.id}\t\t${r.kb}\t${r.ms}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
