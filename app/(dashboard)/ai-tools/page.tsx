'use client';

import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FeatureGate } from '@/components/shared/FeatureGate';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/components/ui/toast';

const AI_TABS: { id: string; label: string }[] = [
  { id: 'jd', label: 'JD analyser' },
  { id: 'linkedin', label: 'LinkedIn summary' },
  { id: 'cold', label: 'Cold email' },
  { id: 'bullet', label: 'Bullet improver' },
  { id: 'interview', label: 'Interview prep' },
];

export default function AIToolsPage() {
  const { tier } = useSubscription();
  const { toast } = useToast();
  const [tab, setTab] = useState('jd');
  const [jd, setJd] = useState('');
  const [jdOut, setJdOut] = useState('');
  const [li, setLi] = useState('');
  const [liOut, setLiOut] = useState('');
  const [loading, setLoading] = useState(false);

  async function run(tool: string, payload: Record<string, string>) {
    setLoading(true);
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, payload }),
    });
    const j = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast(j.error === 'upgrade_required' ? 'Upgrade to use this tool.' : 'Request failed.', 'error');
      return;
    }
    return j.result;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-bold">AI tools</h1>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={AI_TABS}
      />
      {tab === 'jd' ? (
        <div className="space-y-3">
          <Textarea label="Job description" value={jd} onChange={(e) => setJd(e.target.value)} />
          <Button
            variant="primary"
            loading={loading}
            onClick={async () => {
              const r = await run('jd_analyze', { jobDescription: jd });
              setJdOut(JSON.stringify(r, null, 2));
            }}
          >
            Analyse
          </Button>
          {jdOut ? <pre className="rounded-lg bg-slate-900 p-4 text-xs text-slate-100">{jdOut}</pre> : null}
        </div>
      ) : null}
      {tab === 'linkedin' ? (
        <FeatureGate requiredTier={['pro', 'premium', 'career']} userTier={tier}>
          <div className="space-y-3">
            <Textarea label="Current summary" value={li} onChange={(e) => setLi(e.target.value)} />
            <Button
              variant="primary"
              loading={loading}
              onClick={async () => {
                const r = await run('linkedin_summary', { text: li });
                setLiOut(typeof r === 'string' ? r : '');
              }}
            >
              Rewrite
            </Button>
            {liOut ? <Textarea label="Result" value={liOut} readOnly /> : null}
          </div>
        </FeatureGate>
      ) : null}
      {tab === 'cold' ? (
        <FeatureGate requiredTier={['pro', 'premium', 'career']} userTier={tier}>
          <Textarea
            label="Context (role, company, hook)"
            value={li}
            onChange={(e) => setLi(e.target.value)}
          />
          <Button
            variant="primary"
            className="mt-2"
            loading={loading}
            onClick={async () => {
              const r = await run('cold_email', { context: li });
              setJdOut(JSON.stringify(r, null, 2));
            }}
          >
            Generate variants
          </Button>
          {jdOut ? <pre className="mt-4 text-xs">{jdOut}</pre> : null}
        </FeatureGate>
      ) : null}
      {tab === 'bullet' ? (
        <FeatureGate requiredTier={['pro', 'premium', 'career']} userTier={tier}>
          <Textarea label="Bullet" value={li} onChange={(e) => setLi(e.target.value)} />
          <Button
            variant="primary"
            className="mt-2"
            loading={loading}
            onClick={async () => {
              const r = await run('bullet_improve', { bullet: li });
              setJdOut(JSON.stringify(r, null, 2));
            }}
          >
            Improve
          </Button>
          {jdOut ? <pre className="mt-4 text-xs">{jdOut}</pre> : null}
        </FeatureGate>
      ) : null}
      {tab === 'interview' ? (
        <FeatureGate requiredTier={['premium', 'career']} userTier={tier}>
          <Textarea label="Job description" value={jd} onChange={(e) => setJd(e.target.value)} />
          <Button
            variant="primary"
            className="mt-2"
            loading={loading}
            onClick={async () => {
              const r = await run('interview_questions', { jobDescription: jd });
              setJdOut(JSON.stringify(r, null, 2));
            }}
          >
            Generate questions
          </Button>
          {jdOut ? <pre className="mt-4 text-xs">{jdOut}</pre> : null}
        </FeatureGate>
      ) : null}
    </div>
  );
}
