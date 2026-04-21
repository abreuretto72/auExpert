/**
 * Claude message builders — wrap pet-diary text, photos, OCR scans, and PDF
 * documents into the Anthropic Messages API `content` blocks. These builders
 * are I/O plumbing (format adapters) — the actual prompt wording lives in
 * ./prompts/*.ts and is passed separately as the system prompt.
 */

import type { ClaudeMessage } from './types.ts';
import { detectMediaType } from './media.ts';

export function buildPDFMessages(pdfBase64: string, text?: string): ClaudeMessage[] {
  return [{
    role: 'user',
    content: [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
      },
      {
        type: 'text',
        text: text ?? 'Analyze this veterinary document and extract all health records for this pet.',
      },
    ],
  }];
}

// ── Message builder ──

export function buildOCRMessages(photo_base64?: string): ClaudeMessage[] {
  if (!photo_base64) return [{ role: 'user', content: 'No image provided.' }];
  return [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: { type: 'base64', media_type: detectMediaType(photo_base64), data: photo_base64 },
      },
      { type: 'text', text: 'Analyze this veterinary document. Extract ALL visible fields and populate ocr_data.fields with every key-value pair found — one entry per data row. Never return fields as an empty array.' },
    ],
  }];
}

export function buildMessages(text?: string, photos_base64?: string[]): ClaudeMessage[] {
  const photos = (photos_base64 ?? []).slice(0, 5); // max 5 images
  if (photos.length > 0) {
    const imageContent = photos.map((p) => ({
      type: 'image',
      source: { type: 'base64', media_type: detectMediaType(p), data: p },
    }));
    return [{
      role: 'user',
      content: [
        ...imageContent,
        {
          type: 'text',
          text: text || (photos.length > 1 ? 'Analyze these images of my pet.' : 'Analyze this image of my pet.'),
        },
      ],
    }];
  }

  return [{ role: 'user', content: text || '(Tutor shared a pet diary entry — analyze it.)' }];
}
