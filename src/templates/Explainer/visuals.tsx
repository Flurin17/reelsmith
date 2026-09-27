import React from 'react';
import { Easing, interpolate } from 'remotion';
import { useBrand } from '../../brand/context';
import { ProductImage } from '../../components/ProductImage';
import type { ExplainerVisual } from './schema';

const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) } as const;

/** Card with a colored header and an image, sliding in from one side. */
const SideCard: React.FC<{
  label: string;
  image: string;
  note: string;
  from: 'left' | 'right';
  local: number;
  tone: 'primary' | 'secondary';
}> = ({ label, image, note, from, local, tone }) => {
  const { colors, font } = useBrand();
  const bg = tone === 'primary' ? colors.primary : colors.secondary;
  const fg = tone === 'primary' ? colors.onPrimary : colors.onSecondary;
  return (
    <div
      style={{
        width: 390,
        height: 600,
        border: `1px solid ${colors.ink}`,
        background: colors.surface,
        boxShadow: `16px 16px 0 ${bg}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        translate: `${interpolate(local, [0, 18], [from === 'left' ? -160 : 160, 0], ease)}px 0px`,
        scale: interpolate(local, [0, 18], [0.86, 1], ease),
      }}
    >
      <div
        style={{
          background: bg,
          color: fg,
          fontFamily: font.display,
          fontSize: 52,
          lineHeight: 1,
          textAlign: 'center',
          padding: '18px 0 14px',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <ProductImage image={image} label={label} maxWidth={320} maxHeight={note ? 360 : 440} />
      </div>
      {note ? (
        <div
          style={{
            borderTop: `1px solid ${colors.border}`,
            padding: '14px 16px 18px',
            fontFamily: font.body,
            fontWeight: 700,
            fontSize: 26,
            color: colors.inkMuted,
            textAlign: 'center',
          }}
        >
          {note}
        </div>
      ) : null}
    </div>
  );
};

const Versus: React.FC<{ visual: Extract<ExplainerVisual, { type: 'versus' }>; local: number }> = ({
  visual,
  local,
}) => {
  const { colors, font } = useBrand();
  const pop = interpolate(local, [10, 26], [0, 1], { ...ease, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
  return (
    <div style={{ position: 'relative', display: 'flex', gap: 40, justifyContent: 'center' }}>
      <SideCard {...visual.left} from="left" local={local} tone="secondary" />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          translate: '-50% -50%',
          zIndex: 3,
          scale: pop,
          width: 104,
          height: 104,
          rotate: '45deg',
          background: colors.ink,
          border: `4px solid ${colors.secondary}`,
          boxShadow: `7px 7px 0 ${colors.primary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ rotate: '-45deg', fontFamily: font.display, fontSize: 46, color: colors.secondary }}>VS</div>
      </div>
      <SideCard {...visual.right} from="right" local={local} tone="primary" />
    </div>
  );
};

const Bullets: React.FC<{ items: string[]; local: number }> = ({ items, local }) => {
  const { colors, font } = useBrand();
  return (
    <div style={{ width: '100%', display: 'grid', gap: 22 }}>
      {items.map((item, i) => {
        const p = interpolate(local, [8 + i * 9, 22 + i * 9], [0, 1], ease);
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 26,
              background: colors.surface,
              border: `2px solid ${colors.ink}`,
              boxShadow: `10px 10px 0 ${i % 2 === 0 ? colors.secondary : colors.primary}`,
              padding: '26px 30px',
              opacity: p,
              translate: `${interpolate(p, [0, 1], [-80, 0])}px 0px`,
            }}
          >
            <div
              style={{
                flex: 'none',
                width: 58,
                height: 58,
                background: colors.primary,
                color: colors.onPrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: font.display,
                fontSize: 38,
              }}
            >
              {i + 1}
            </div>
            <div style={{ fontFamily: font.body, fontWeight: 800, fontSize: 44, lineHeight: 1.15, color: colors.ink }}>
              {item}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Stat: React.FC<{ visual: Extract<ExplainerVisual, { type: 'stat' }>; local: number }> = ({ visual, local }) => {
  const { colors, font, locale } = useBrand();
  const p = interpolate(local, [4, 40], [0, 1], { ...ease, easing: Easing.out(Easing.cubic) });
  const decimals = Number.isInteger(visual.value) ? 0 : 1;
  const shown = new Intl.NumberFormat(locale, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(visual.value * p);
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 18 }}>
      <div
        style={{
          fontFamily: font.display,
          fontSize: 300,
          lineHeight: 0.9,
          color: colors.ink,
          textShadow: `12px 12px 0 ${colors.secondary}`,
        }}
      >
        {visual.prefix}
        {shown}
        {visual.suffix}
      </div>
      {visual.label ? (
        <div
          style={{
            background: colors.primary,
            color: colors.onPrimary,
            padding: '12px 26px',
            fontFamily: font.body,
            fontWeight: 900,
            fontSize: 40,
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          {visual.label}
        </div>
      ) : null}
    </div>
  );
};

const ImageCard: React.FC<{ visual: Extract<ExplainerVisual, { type: 'image' }>; local: number }> = ({
  visual,
  local,
}) => {
  const { colors, font } = useBrand();
  const p = interpolate(local, [0, 18], [0, 1], ease);
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.ink}`,
        boxShadow: `18px 18px 0 ${colors.primary}`,
        padding: 36,
        display: 'grid',
        justifyItems: 'center',
        gap: 20,
        scale: interpolate(p, [0, 1], [0.9, 1]),
        opacity: p,
      }}
    >
      <ProductImage image={visual.image} label={visual.caption || 'Image'} maxWidth={640} maxHeight={560} />
      {visual.caption ? (
        <div style={{ fontFamily: font.body, fontWeight: 800, fontSize: 34, color: colors.inkMuted }}>
          {visual.caption}
        </div>
      ) : null}
    </div>
  );
};

/** Renders the lower-half visual of an explainer scene. */
export const Visual: React.FC<{ visual: ExplainerVisual; local: number }> = ({ visual, local }) => {
  switch (visual.type) {
    case 'versus':
      return <Versus visual={visual} local={local} />;
    case 'bullets':
      return <Bullets items={visual.items} local={local} />;
    case 'stat':
      return <Stat visual={visual} local={local} />;
    case 'image':
      return <ImageCard visual={visual} local={local} />;
    default:
      return null;
  }
};
