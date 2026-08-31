export interface CoverLetterDocxVars {
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  applicant_location: string;
  applicant_linkedin: string;
  company_name: string;
  job_title: string;
  date: string;
  cover_letter_body: string;
  primary_color: string;
  [key: string]: string;
}

export interface CoverLetterDocxTheme {
  accent: string;
  bodyFont: string;
  headingFont: string;
  bodyColor: string;
  mutedColor: string;
}
