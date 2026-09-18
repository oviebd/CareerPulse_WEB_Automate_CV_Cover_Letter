'use client';

import { Modal } from '@/components/ui/modal';
import { UpgradePlans } from '@/components/billing/UpgradePlans';
import { useUIStore, type GoPremiumFeature } from '@/stores/useUIStore';

const COPY: Record<GoPremiumFeature, { title: string; body: string }> = {
  interview: {
    title: 'Interview preparation',
    body: 'Get AI coaching tailored to your role, practice questions, and readiness scoring with Premium.',
  },
  export: {
    title: 'Export PDF & DOCX',
    body: 'Download polished PDFs and Google Docs–compatible files for your CV and cover letters.',
  },
  template: {
    title: 'Premium templates',
    body: 'Use premium CV and cover letter layouts, set them as default, and export with your chosen design.',
  },
  docx: {
    title: 'DOCX export',
    body: 'Export to Google Docs (Word) format for easy editing and sharing.',
  },
};

export function GoPremiumDialog() {
  const goPremiumFeature = useUIStore((s) => s.goPremiumFeature);
  const closeGoPremium = useUIStore((s) => s.closeGoPremium);
  const isOpen = goPremiumFeature !== null;
  const copy = goPremiumFeature ? COPY[goPremiumFeature] : COPY.export;

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeGoPremium}
      title="Go Premium"
      className="max-w-3xl"
    >
      <p className="mb-1 font-medium text-[var(--color-text-primary)]">{copy.title}</p>
      <p className="mb-6 text-sm text-[var(--color-muted)]">{copy.body}</p>
      <UpgradePlans allowCheckout />
    </Modal>
  );
}
