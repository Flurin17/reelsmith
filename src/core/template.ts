import type React from 'react';
import { z } from 'zod';
import type { CalculateMetadataFunction } from 'remotion';
import { brandOverride } from '../brand/types';

/** Output format. Templates are laid out for 9:16 (TikTok / Reels / Shorts). */
export const VIDEO = { width: 1080, height: 1920, fps: 30 } as const;

/**
 * Keep key content inside a generous safe area, clear of the platform UI
 * (caption + action rail at the bottom/right, status bar at the top).
 */
export const SAFE = { side: 90, top: 200, bottom: 320 } as const;

/** Build a template props schema; adds the optional per-video `brand` override. */
export const withBrand = <T extends z.ZodRawShape>(shape: T) => z.object({ ...shape, brand: brandOverride.optional() });

/**
 * A render-side template: everything Remotion needs to register one
 * composition. Browser-bundled — no Node-only imports here.
 */
export interface Template<P extends Record<string, unknown> = Record<string, unknown>> {
  /** Composition id, used as `template` in job files. PascalCase. */
  id: string;
  /** One line for `reelsmith list` and the docs. */
  description: string;
  component: React.FC<P>;
  schema: z.ZodType<P, any>;
  defaultProps: P;
  /** Fallback length; most templates compute it in calculateMetadata. */
  durationInFrames: number;
  calculateMetadata?: CalculateMetadataFunction<P>;
  /**
   * Representative frames for `reelsmith stills` (one per scene/beat), given
   * the props AFTER calculateMetadata. Defaults to evenly spaced frames.
   */
  stills?: (props: P, durationInFrames: number) => number[];
}

export function defineTemplate<P extends Record<string, unknown>>(template: Template<P>): Template<P> {
  return template;
}
