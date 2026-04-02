-- Add font_family support to CV and Job Specific CVs
ALTER TABLE cv_profiles ADD COLUMN font_family TEXT DEFAULT 'Inter';
ALTER TABLE job_specific_cvs ADD COLUMN font_family TEXT DEFAULT 'Inter';
