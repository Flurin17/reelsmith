import { z } from 'zod';

/**
 * Semantic color tokens. Templates never hardcode colors; they read these.
 *
 * Two families exist because templates come in two looks:
 * - "paper" (light editorial): paper/surface/muted/border/ink/inkMuted + primary/secondary
 * - "night" (dark cinematic):  night/onNight + accent/highlight
 */
export const brandColors = z.object({
  /** Page background of light templates. */
  paper: z.string(),
  /** Cards and panels on paper. */
  surface: z.string(),
  /** Subtle fills (chips, meters) on paper. */
  muted: z.string(),
  /** Hairline borders on paper. */
  border: z.string(),
  /** Main text and strong outlines on paper. */
  ink: z.string(),
  /** Secondary text on paper. */
  inkMuted: z.string(),
  /** Main brand color (badges, highlights, CTA shadows). */
  primary: z.string(),
  onPrimary: z.string(),
  /** Supporting brand color (price tags, sweeps, underlines). */
  secondary: z.string(),
  onSecondary: z.string(),
  /** Background of dark templates. */
  night: z.string(),
  onNight: z.string(),
  /** Price badge / accent on dark templates. */
  accent: z.string(),
  onAccent: z.string(),
  /** Sparkles and glows on dark templates. */
  highlight: z.string(),
});
export type BrandColors = z.infer<typeof brandColors>;

export const fontSpec = z.object({
  /** CSS family name, e.g. "Anton". For Google fonts this is also the lookup key. */
  family: z.string(),
  /** `google` (default) loads from Google Fonts; `local` loads `src` from public/. */
  source: z.enum(['google', 'local']).default('google'),
  /** Weights to load, e.g. ['400', '700']. */
  weights: z.array(z.string()).default(['400']),
  /** For `local`: file path inside public/ (e.g. "fonts/Brand-Bold.woff2"). */
  src: z.string().optional(),
});
export type FontSpec = z.input<typeof fontSpec>;

export const brandSchema = z.object({
  /** Display name, used in wordmarks and CTA cards. */
  name: z.string(),
  /** Domain shown in CTAs, without protocol (e.g. "example.com"). */
  url: z.string(),
  /** Social handle shown in some overlays (e.g. "@example"). */
  handle: z.string().default(''),
  /** Logo file inside public/ (SVG/PNG). Empty = render `name` as a text wordmark. */
  logo: z.string().default(''),
  /** BCP 47 locale for number/price formatting (e.g. "en-US", "de-CH"). */
  locale: z.string().default('en-US'),
  /** ISO 4217 currency code (e.g. "USD", "EUR", "CHF"). */
  currency: z.string().default('USD'),
  colors: brandColors,
  fonts: z.object({ display: fontSpec, body: fontSpec }),
});
export type Brand = z.input<typeof brandSchema>;
export type ResolvedBrand = z.output<typeof brandSchema>;

/**
 * Per-video brand override, merged over the config brand. Lets one install
 * render videos for several brands/clients. Fonts are config-only because they
 * must be loaded before the first frame.
 */
export const brandOverride = z
  .object({
    name: z.string(),
    url: z.string(),
    handle: z.string(),
    logo: z.string(),
    locale: z.string(),
    currency: z.string(),
    colors: brandColors.partial(),
  })
  .partial();
export type BrandOverride = z.infer<typeof brandOverride>;

export function mergeBrand(base: ResolvedBrand, override?: BrandOverride): ResolvedBrand {
  if (!override) return base;
  const { colors, ...rest } = override;
  const defined = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
  return { ...base, ...defined, colors: { ...base.colors, ...(colors ?? {}) } };
}
