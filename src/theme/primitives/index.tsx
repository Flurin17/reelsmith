/**
 * The design system. Templates build ONLY from these + useTheme(), so a brand
 * restyles every template by editing brands/<id>/theme.ts.
 *
 * Overridable per brand (theme.components): Backdrop, Surface, Chip, Price, Logo.
 * An override receives the same props; import the Default* version to wrap it.
 */
import React from 'react';
import { useTheme } from '../context';
import type { ThemeComponents } from '../types';
import { DefaultBackdrop } from './Backdrop';
import { DefaultLogo } from './Logo';
import { DefaultPrice } from './Price';
import { DefaultChip, DefaultSurface } from './Surface';

function themed<K extends keyof ThemeComponents>(name: K, Default: ThemeComponents[K]): ThemeComponents[K] {
  const Component: React.FC<Record<string, unknown>> = (props) => {
    const t = useTheme();
    const Impl = (t.components?.[name] ?? Default) as React.FC<Record<string, unknown>>;
    return <Impl {...props} />;
  };
  Component.displayName = name;
  return Component as unknown as ThemeComponents[K];
}

export const Backdrop = themed('Backdrop', DefaultBackdrop);
export const Surface = themed('Surface', DefaultSurface);
export const Chip = themed('Chip', DefaultChip);
export const Price = themed('Price', DefaultPrice);
export const Logo = themed('Logo', DefaultLogo);

export { DefaultBackdrop, DefaultChip, DefaultLogo, DefaultPrice, DefaultSurface };
export { Grain } from './Backdrop';
export { Music, Sfx, Voiceover } from './Audio';
export { Captions } from './Captions';
export { Counter } from './Counter';
export { Frame } from './Frame';
export { Marquee } from './Marquee';
export { DomainCta, DomainCtaSfx, domainCtaTiming, typedCount } from './DomainCta';
export { Phone, PHONE_SCREEN } from './Phone';
export { PriceText } from './Price';
export { Product } from './Product';
export { Reveal, revealStyle, useExit } from './Reveal';
export { Text, Words, fitSize } from './Text';
