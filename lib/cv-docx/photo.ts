import { AlignmentType, ImageRun, Paragraph } from 'docx';
import type { CVData } from '@/src/types/cv.types';
import type { DocxTheme } from './types';
import { nameInitial } from './utils';
import { centeredLine, run } from './primitives';

const MAX_PHOTO_BYTES = 512_000;

async function loadPhotoBuffer(
  src: string
): Promise<{ data: Buffer; type: 'jpg' | 'png' | 'gif' } | null> {
  try {
    if (src.startsWith('data:image/')) {
      const m = src.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!m) return null;
      const ext = m[1].toLowerCase();
      const type =
        ext === 'jpeg' || ext === 'jpg'
          ? 'jpg'
          : ext === 'png'
            ? 'png'
            : ext === 'gif'
              ? 'gif'
              : 'png';
      const data = Buffer.from(m[2], 'base64');
      if (data.length > MAX_PHOTO_BYTES) return null;
      return { data, type };
    }
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const res = await fetch(src, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_PHOTO_BYTES) return null;
      const ct = res.headers.get('content-type') ?? '';
      const type = ct.includes('png')
        ? 'png'
        : ct.includes('gif')
          ? 'gif'
          : 'jpg';
      return { data: buf, type };
    }
  } catch {
    return null;
  }
  return null;
}

export async function buildPhotoParagraph(
  cvData: CVData,
  theme: DocxTheme
): Promise<Paragraph | null> {
  const src = cvData.personal.photo?.trim();
  if (!theme.showPhoto) return null;

  if (src) {
    const loaded = await loadPhotoBuffer(src);
    if (loaded) {
      return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new ImageRun({
            data: loaded.data,
            transformation: { width: 96, height: 96 },
            type: loaded.type,
          }),
        ],
      });
    }
  }

  const initial = nameInitial(cvData.personal.fullName ?? '');
  return centeredLine(theme, initial, {
    bold: true,
    size: 48,
    color: theme.accent,
    after: 120,
  });
}

export async function buildSidebarPhoto(
  cvData: CVData,
  theme: DocxTheme
): Promise<Paragraph[]> {
  const p = await buildPhotoParagraph(cvData, theme);
  return p ? [p] : [];
}

/** Initial avatar when photo unavailable (premium dark sidebar). */
export function buildInitialAvatar(
  cvData: CVData,
  theme: DocxTheme
): Paragraph {
  const initial = nameInitial(cvData.personal.fullName ?? '');
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [
      run(theme, initial, {
        bold: true,
        size: 56,
        color: theme.accent,
      }),
    ],
  });
}
