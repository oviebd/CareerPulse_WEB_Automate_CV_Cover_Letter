import {
  getCoverLetterTemplatesForLanding,
  getCvTemplatesForLanding,
} from '@/lib/landing-cv-templates';
import { LandingHero } from '@/components/marketing/LandingHero';
import { LandingFeatures } from '@/components/marketing/LandingFeatures';
import { LandingInterviewPrep } from '@/components/marketing/LandingInterviewPrep';
import { LandingHowItWorks } from '@/components/marketing/LandingHowItWorks';
import { LandingTemplatesSection } from '@/components/marketing/LandingTemplatesSection';
import { LandingFinalCta } from '@/components/marketing/LandingFinalCta';
import { LandingFooter } from '@/components/marketing/LandingFooter';

export default async function LandingPage() {
  const [cvTemplates, coverLetterTemplates] = await Promise.all([
    getCvTemplatesForLanding(),
    getCoverLetterTemplatesForLanding(),
  ]);

  return (
    <main>
      <LandingHero />
      <LandingFeatures />
      <LandingInterviewPrep />
      <LandingHowItWorks />
      <LandingTemplatesSection
        cvTemplates={cvTemplates}
        coverLetterTemplates={coverLetterTemplates}
      />
      <LandingFinalCta />
      <LandingFooter />
    </main>
  );
}
