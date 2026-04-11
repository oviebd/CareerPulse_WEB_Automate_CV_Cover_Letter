'use client';

import { Button } from '@/components/ui/button';

type Props = {
  index: number;
  length: number;
  onMove: (from: number, to: number) => void;
};

export function ListReorderArrows({ index, length, onMove }: Props) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 w-8 shrink-0 p-0"
        disabled={index <= 0}
        title="Move up"
        onClick={() => onMove(index, index - 1)}
      >
        ↑
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 w-8 shrink-0 p-0"
        disabled={index >= length - 1}
        title="Move down"
        onClick={() => onMove(index, index + 1)}
      >
        ↓
      </Button>
    </div>
  );
}
