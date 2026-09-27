import React, { createContext, useContext, useMemo } from 'react';
import config from '../../reelsmith.config';
import { cssFamily } from './fonts';
import { formatPrice, formatTotal, priceParts, withAlpha } from './format';
import { brandSchema, mergeBrand, type BrandOverride, type ResolvedBrand } from './types';

/** The brand from reelsmith.config.ts, validated once. */
export const baseBrand: ResolvedBrand = brandSchema.parse(config.brand);

const BrandContext = createContext<ResolvedBrand>(baseBrand);

/** Provides the config brand merged with an optional per-video override. */
export const BrandProvider: React.FC<{ override?: BrandOverride; children: React.ReactNode }> = ({
  override,
  children,
}) => {
  const brand = useMemo(() => mergeBrand(baseBrand, override), [override]);
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
};

/**
 * Everything a template needs to stay on-brand: colors, font stacks, and
 * locale-aware price helpers.
 */
export function useBrand() {
  const brand = useContext(BrandContext);
  return useMemo(
    () => ({
      ...brand,
      font: { display: cssFamily(brand.fonts.display), body: cssFamily(brand.fonts.body) },
      price: (value: number) => formatPrice(value, brand.locale, brand.currency),
      priceParts: (value: number) => priceParts(value, brand.locale, brand.currency),
      total: (values: number[]) => formatTotal(values, brand.locale, brand.currency),
      alpha: withAlpha,
    }),
    [brand],
  );
}

export type BrandKit = ReturnType<typeof useBrand>;
