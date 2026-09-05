'use client';

import { Button } from '@/components/ui/button';

type Question = {
  id: string;
  question_type: string;
  question_text: string;
  options_json?: string[] | null;
};

export function QuizQuestionField({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  const type = question.question_type;
  const options = Array.isArray(question.options_json) ? question.options_json : [];

  if ((type === 'single_choice' || type === 'multiple_choice' || type === 'scenario') && options.length > 0) {
    return (
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)] p-3 hover:bg-[var(--color-hover-surface)]"
          >
            <input
              type="radio"
              name={question.id}
              checked={value === opt}
              onChange={() => onChange(opt)}
            />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (type === 'true_false') {
    return (
      <div className="flex gap-2">
        {['true', 'false'].map((opt) => (
          <Button
            key={opt}
            variant={value === opt ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onChange(opt)}
          >
            {opt === 'true' ? 'True' : 'False'}
          </Button>
        ))}
      </div>
    );
  }

  if (type === 'multiple_select' && options.length > 0) {
    const selected = value ? value.split('|||') : [];
    return (
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)] p-3"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => {
                const next = selected.includes(opt)
                  ? selected.filter((s) => s !== opt)
                  : [...selected, opt];
                onChange(next.join('|||'));
              }}
            />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <p className="text-sm text-[var(--color-muted)]">
      This question type is not supported. Please regenerate the quiz.
    </p>
  );
}
