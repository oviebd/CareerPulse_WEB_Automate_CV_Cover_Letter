'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface TemplateThumbnailProps {
  templateId: string;
  accent: string;
  name: string;
  className?: string;
}

const CV_DOC_WIDTH = 794;
const CV_DOC_HEIGHT = 1123;

export function TemplateThumbnail({
  templateId,
  accent,
  name,
  className,
}: TemplateThumbnailProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / CV_DOC_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const src = `/api/cv/preview-html?template_id=${encodeURIComponent(
    templateId
  )}&sample=1&accent=${encodeURIComponent(accent)}`;

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative aspect-[210/297] w-full overflow-hidden bg-white shadow-inner',
        className
      )}
    >
      <div
        className="absolute left-0 top-0 origin-top-left pointer-events-none"
        style={{
          width: CV_DOC_WIDTH,
          height: CV_DOC_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        <iframe
          src={src}
          className="block h-full w-full border-0"
          width={CV_DOC_WIDTH}
          height={CV_DOC_HEIGHT}
          title={`${name} preview`}
          loading="lazy"
        />
      </div>
      {/* Overlay to prevent interaction with iframe and add a slight zoom-out look */}
      <div className="absolute inset-0 z-10" />
    </div>
  );
}
