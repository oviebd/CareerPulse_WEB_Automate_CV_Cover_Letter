'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { invalidateCreditQueries } from '@/hooks/useCredits';
import { formatCredits } from '@/lib/credits/calculator';
import type { PromoResultType } from '@/lib/promo/resolvePromoResultType';
import { useAuthStore } from '@/stores/useAuthStore';
import { refreshCareerPulseSession } from '@/lib/auth/refresh-session';
import type { Profile } from '@/types';

type PromoApplyResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  tier?: 'pro' | null;
  bonusCredits?: number;
  resultType?: PromoResultType;
  expiresAt?: string | null;
};

function getPromoSuccessContent(resultType: PromoResultType, bonusCredits: number) {
  switch (resultType) {
    case 'premium':
      return {
        title: "You're now Premium!",
        body: 'Promo code applied successfully. Premium access is now unlimited.',
        detail: 'You now have unlimited tailored applications, premium CV templates, AI enhancements, DOCX export, and all Premium features.',
        button: 'Start using Premium',
      };
    case 'credits':
      return {
        title: 'Credits added!',
        body: `${formatCredits(bonusCredits)} AI credits have been added to your account.`,
        detail: 'Use your credits for AI enhancements, rewrites, and other AI-powered features.',
        button: 'Got it',
      };
    case 'both':
      return {
        title: 'Promo applied!',
        body: `Premium access is now active and ${formatCredits(bonusCredits)} bonus credits have been added to your account.`,
        detail: 'You now have unlimited tailored applications, premium CV templates, AI enhancements, DOCX export, and all Premium features.',
        button: 'Start using Premium',
      };
  }
}

export function PromoCodeCard({ profile }: { profile: Profile | null }) {
  const setProfile = useAuthStore((s) => s.setProfile);
  const queryClient = useQueryClient();
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState<{ resultType: PromoResultType; bonusCredits: number } | null>(null);

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await fetch('/api/promo/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode }),
      });
      const j = (await res.json()) as PromoApplyResponse;
      if (!res.ok || !j.ok) {
        setPromoError(j.error ?? 'Invalid promo code.');
        return;
      }
      if (profile) {
        const updated: Profile = { ...profile, promo_code_used: j.code ?? promoCode.trim() };
        if (j.tier === 'pro') {
          updated.subscription_tier = 'pro';
          updated.subscription_status = 'active';
          updated.subscription_expires_at = j.expiresAt ?? null;
        }
        setProfile(updated);
      }
      if (j.resultType === 'credits' || j.resultType === 'both') {
        invalidateCreditQueries(queryClient);
      }
      await refreshCareerPulseSession();
      await queryClient.invalidateQueries({ queryKey: ['billing-subscription'] });
      setPromoCode('');
      setShowPromo(false);
      setPromoSuccess({ resultType: j.resultType ?? 'premium', bonusCredits: j.bonusCredits ?? 0 });
    } catch {
      setPromoError('Something went wrong. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  }

  const success = promoSuccess ? getPromoSuccessContent(promoSuccess.resultType, promoSuccess.bonusCredits) : null;

  return (
    <>
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Promo Code</h2>
          {!showPromo && (
            <button
              type="button"
              onClick={() => {
                setShowPromo(true);
                setPromoError('');
              }}
              className="text-sm text-[var(--color-primary-500)] transition hover:underline"
            >
              Have a promo code?
            </button>
          )}
        </div>
        {showPromo && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value);
                  setPromoError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void applyPromo();
                }}
                placeholder="Enter promo code"
                className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                disabled={promoLoading}
                autoFocus
              />
              <Button variant="primary" size="sm" onClick={() => void applyPromo()} disabled={promoLoading || !promoCode.trim()}>
                {promoLoading ? 'Applying…' : 'Apply'}
              </Button>
            </div>
            {promoError && <p className="text-sm text-[var(--color-danger)]">{promoError}</p>}
          </div>
        )}
      </Card>
      {success ? (
        <Modal isOpen onClose={() => setPromoSuccess(null)} title={success.title}>
          <div className="space-y-4 text-center">
            <p className="text-[var(--color-text-primary)]">{success.body}</p>
            <p className="text-sm text-[var(--color-muted)]">{success.detail}</p>
            <Button variant="primary" className="w-full" onClick={() => setPromoSuccess(null)}>
              {success.button}
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
