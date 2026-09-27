/**
 * Brand registry. Add a brand: create brands/<id>/theme.ts (copy one of these)
 * and add one import line below. Jobs pick a brand with `"brand": "<id>"`.
 */
import type { Theme } from '../src/theme/types';
import kin from './kin/theme';
import lumen from './lumen/theme';
import nocturne from './nocturne/theme';
import orbit from './orbit/theme';
import volt from './volt/theme';

export const BRANDS: Record<string, Theme> = { lumen, nocturne, volt, kin, orbit };

/** Used when a job has no `brand`. */
export const DEFAULT_BRAND = 'lumen';
