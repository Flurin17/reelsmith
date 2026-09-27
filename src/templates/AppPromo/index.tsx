import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import config from '../../../reelsmith.config';
import { musicSchema, sfxSchema } from '../../core/schemas';
import { placeScenes, resolveScenes, sceneFields } from '../../core/scenes';
import { SAFE, VIDEO, defineTemplate, jobProps } from '../../core/template';
import type { Placed } from '../../core/timeline';
import { useTheme, type ThemeKit } from '../../theme/context';
import {
  Backdrop,
  Counter,
  DomainCta,
  DomainCtaSfx,
  Logo,
  Music,
  PHONE_SCREEN,
  Phone,
  Sfx,
  Surface,
  Voiceover,
  Words,
  fitSize,
} from '../../theme/primitives';

/**
 * App / SaaS promo: a phone with a live, animated UI (no screenshots needed),
 * a headline per scene, floating glass callouts, typed CTA. Screens:
 * balance · chart · notify · list · splash.
 */
const row = z.object({ label: z.string(), amount: z.number(), note: z.string().default('') });
const screen = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('balance'),
    label: z.string().default('Balance'),
    amount: z.number(),
    delta: z.string().default(''),
  }),
  z.object({
    type: z.literal('chart'),
    title: z.string(),
    value: z.number().optional(),
    points: z.array(z.number()).min(3),
  }),
  z.object({ type: z.literal('notify'), title: z.string(), body: z.string(), time: z.string().default('9:41') }),
  z.object({ type: z.literal('list'), title: z.string(), rows: z.array(row).min(1).max(5) }),
  z.object({ type: z.literal('splash') }),
]);
type Screen = z.infer<typeof screen>;

const scene = z.object({
  ...sceneFields,
  headline: z.string().describe('≤ 6 words; *word* = emphasis'),
  screen,
  callout: z.string().default('').describe('short floating badge next to the phone'),
  cta: z.boolean().default(false).describe('shrink the phone and type the domain'),
});
type Scene = z.infer<typeof scene>;

const schema = jobProps({ scenes: z.array(scene).min(1), music: musicSchema, sfx: sfxSchema });
type Props = z.infer<typeof schema>;

const CTA_HOLD = Math.round(2.6 * VIDEO.fps);
const extra = (s: Scene) => (s.cta ? CTA_HOLD : 0);
const W = PHONE_SCREEN.width;

// ---------------------------------------------------------------- screens

const StatusBar: React.FC<{ t: ThemeKit }> = ({ t }) => (
  <div
    data-audit="decorative"
    style={{
      ...t.type('body', { weight: 700 }),
      display: 'flex',
      justifyContent: 'space-between',
      padding: '26px 40px 0',
      fontSize: 22,
      color: t.colors.text,
    }}
  >
    <span>9:41</span>
    <span style={{ letterSpacing: 2 }}>●●● ▮</span>
  </div>
);

const AppHeader: React.FC<{ t: ThemeKit; title: string }> = ({ t, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '44px 34px 20px' }}>
    <div style={{ ...t.type('title'), fontSize: 40, color: t.colors.text }}>{title}</div>
    <div
      style={{
        width: 58,
        height: 58,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${t.gradient[0]}, ${t.gradient[2] ?? t.colors.accent})`,
      }}
    />
  </div>
);

const Balance: React.FC<{ s: Extract<Screen, { type: 'balance' }>; t: ThemeKit }> = ({ s, t }) => {
  const frame = useCurrentFrame();
  const bars = [0.42, 0.66, 0.5, 0.82, 0.6, 0.94, 0.74];
  return (
    <>
      <AppHeader t={t} title={t.name} />
      <div
        style={{
          margin: '10px 30px',
          padding: 34,
          borderRadius: 34,
          background: `linear-gradient(135deg, ${t.colors.primary}, ${t.alpha(t.colors.primary, 0.7)}), ${t.colors.bg}`,
          color: t.colors.onPrimary,
          boxShadow: t.shadow(t.gradient[0]),
        }}
      >
        <div style={{ ...t.type('label'), fontSize: 20 }}>{s.label}</div>
        <div style={{ ...t.type('display'), fontSize: 76, marginTop: 14 }}>
          <Counter value={s.amount} currency delay={8} duration={40} decimals={2} />
        </div>
        {s.delta ? (
          <div
            style={{
              ...t.type('body', { weight: 700 }),
              display: 'inline-block',
              marginTop: 16,
              padding: '8px 16px',
              borderRadius: 999,
              background: t.alpha('#000000', 0.28),
              fontSize: 22,
            }}
          >
            {s.delta}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 300, padding: '40px 40px 0' }}>
        {bars.map((b, i) => {
          const g = t.enter(frame, 20 + i * 4, 20);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${b * 100 * g}%`,
                borderRadius: 14,
                background: i === 5 ? t.colors.accent : t.alpha(t.colors.text, 0.16),
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          ...t.type('label'),
          display: 'flex',
          justifyContent: 'space-between',
          padding: '16px 44px',
          fontSize: 18,
          color: t.colors.muted,
        }}
      >
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
    </>
  );
};

const Chart: React.FC<{ s: Extract<Screen, { type: 'chart' }>; t: ThemeKit }> = ({ s, t }) => {
  const frame = useCurrentFrame();
  const w = W - 60;
  const h = 420;
  const max = Math.max(...s.points);
  const min = Math.min(...s.points);
  const pts = s.points.map((v, i) => [
    (i / (s.points.length - 1)) * w,
    h - ((v - min) / (max - min || 1)) * (h - 40) - 20,
  ]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const draw = t.enter(frame, 8, 40);
  const len = 2400;
  const [lx, ly] = pts[Math.min(pts.length - 1, Math.floor(draw * (pts.length - 1)))];
  return (
    <>
      <AppHeader t={t} title={s.title} />
      {s.value != null ? (
        <div style={{ ...t.type('display'), fontSize: 84, padding: '0 34px', color: t.colors.text }}>
          <Counter value={s.value} currency delay={4} duration={40} />
        </div>
      ) : null}
      <svg width={w} height={h} style={{ margin: '40px 30px 0', overflow: 'visible' }}>
        <defs>
          <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={t.colors.accent} stopOpacity={0.45} />
            <stop offset="1" stopColor={t.colors.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={w} y1={h * g} y2={h * g} stroke={t.alpha(t.colors.text, 0.08)} strokeWidth={2} />
        ))}
        <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#fill)" opacity={draw} />
        <path
          d={d}
          fill="none"
          stroke={t.colors.accent}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - draw)}
        />
        <circle cx={lx} cy={ly} r={14} fill={t.colors.accent} stroke={t.colors.bg} strokeWidth={5} />
      </svg>
    </>
  );
};

const Notify: React.FC<{ s: Extract<Screen, { type: 'notify' }>; t: ThemeKit }> = ({ s, t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = t.pop(frame, fps, 10);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(170deg, ${t.gradient[0]}, ${t.colors.bg} 70%)`,
      }}
    >
      <div style={{ ...t.type('display'), textAlign: 'center', fontSize: 150, marginTop: 120, color: '#ffffff' }}>
        {s.time}
      </div>
      <div
        style={{
          ...t.type('body', { weight: 600 }),
          textAlign: 'center',
          fontSize: 26,
          color: t.alpha('#ffffff', 0.8),
        }}
      >
        Tuesday, 12 March
      </div>
      <div
        style={{
          margin: '70px 22px 0',
          padding: '24px 26px',
          borderRadius: 32,
          background: t.alpha('#ffffff', 0.9),
          color: '#000000',
          display: 'flex',
          gap: 20,
          alignItems: 'center',
          translate: `0px ${interpolate(drop, [0, 1], [-420, 0])}px`,
          opacity: Math.min(1, drop * 2),
        }}
      >
        <div
          style={{
            flex: 'none',
            width: 70,
            height: 70,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${t.gradient[0]}, ${t.gradient[1]})`,
          }}
        />
        <div>
          <div style={{ ...t.type('body', { weight: 800 }), fontSize: 26 }}>{s.title}</div>
          <div style={{ ...t.type('body'), fontSize: 24, marginTop: 4, opacity: 0.8 }}>{s.body}</div>
        </div>
      </div>
    </div>
  );
};

const List: React.FC<{ s: Extract<Screen, { type: 'list' }>; t: ThemeKit }> = ({ s, t }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <AppHeader t={t} title={s.title} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '10px 26px' }}>
        {s.rows.map((r, i) => {
          const p = t.enter(frame, 8 + i * 7);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '22px 22px',
                borderRadius: 26,
                background: t.alpha(t.colors.text, 0.06),
                opacity: p,
                translate: `${(1 - p) * 80}px 0px`,
              }}
            >
              <div
                style={{
                  ...t.type('title'),
                  flex: 'none',
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: t.alpha(r.amount >= 0 ? t.colors.accent : t.colors.primary, 0.25),
                  color: r.amount >= 0 ? t.colors.accent : t.colors.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                }}
              >
                {r.label[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...t.type('body', { weight: 700 }), fontSize: 26, color: t.colors.text }}>{r.label}</div>
                {r.note ? <div style={{ ...t.type('body'), fontSize: 20, color: t.colors.muted }}>{r.note}</div> : null}
              </div>
              <div
                style={{
                  ...t.type('body', { weight: 800 }),
                  fontSize: 28,
                  color: r.amount >= 0 ? t.colors.accent : t.colors.text,
                }}
              >
                {r.amount >= 0 ? '+' : '−'}
                {t.price(Math.abs(r.amount))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

const Splash: React.FC<{ t: ThemeKit }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
        background: `radial-gradient(circle at 50% 40%, ${t.alpha(t.gradient[0], 0.55)}, ${t.colors.bg} 70%)`,
      }}
    >
      <div style={{ scale: t.pop(frame, fps, 4) }}>
        <Logo size={80} />
      </div>
      <div
        style={{ ...t.type('body', { weight: 600 }), fontSize: 26, color: t.colors.muted, opacity: t.enter(frame, 14) }}
      >
        {t.tagline}
      </div>
    </div>
  );
};

const ScreenView: React.FC<{ s: Screen }> = ({ s }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const inP = t.enter(frame, 0, 14);
  const body =
    s.type === 'balance' ? (
      <Balance s={s} t={t} />
    ) : s.type === 'chart' ? (
      <Chart s={s} t={t} />
    ) : s.type === 'notify' ? (
      <Notify s={s} t={t} />
    ) : s.type === 'list' ? (
      <List s={s} t={t} />
    ) : (
      <Splash t={t} />
    );
  return (
    <AbsoluteFill style={{ opacity: inP, translate: `0px ${(1 - inP) * 40}px` }}>
      {s.type !== 'notify' && s.type !== 'splash' ? <StatusBar t={t} /> : null}
      {body}
    </AbsoluteFill>
  );
};

// -------------------------------------------------------------- composition

const AppPromo: React.FC<Props> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const tone = t.tone(0);
  const scenes = placeScenes(props.scenes, fps, { extra, min: 2.8 });
  const rise = t.pop(frame, fps, 2);
  const cta = scenes.find((s) => s.cta);
  const shrink = cta ? t.enter(frame, cta.from + cta.duration - CTA_HOLD, 20) : 0;
  const { sfx } = props;

  return (
    <AbsoluteFill>
      <Backdrop tone={tone} seed="app" />
      <div style={{ position: 'absolute', top: 140, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Logo tone={tone} size={40} />
      </div>

      {scenes.map((s: Placed<Scene>) => (
        <Sequence key={`h-${s.id}`} from={s.from} durationInFrames={s.duration} name={`headline ${s.id}`}>
          <AbsoluteFill style={{ padding: `${SAFE.top + 40}px ${SAFE.side}px 0`, alignItems: 'center' }}>
            <Words
              text={s.headline}
              size={fitSize(t, s.headline, { width: 900, lines: 2, max: 104, min: 60 })}
              color={tone.text}
              accent={tone.accent}
            />
          </AbsoluteFill>
        </Sequence>
      ))}

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 610,
          translate: `-50% ${interpolate(rise, [0, 1], [900, 0]) - shrink * 60}px`,
          transform: `perspective(2400px) rotateX(${interpolate(rise, [0, 1], [24, 4])}deg) rotateY(${Math.sin(frame / 45) * 6}deg)`,
          transformOrigin: '50% 0%',
          scale: `${0.9 * (1 - shrink * 0.32)}`,
        }}
      >
        <Phone>
          {scenes.map((s) => (
            <Sequence key={`s-${s.id}`} from={s.from} durationInFrames={s.duration} layout="none">
              <ScreenView s={s.screen} />
            </Sequence>
          ))}
        </Phone>
      </div>

      {scenes.map((s, i) =>
        s.callout ? (
          <Sequence key={`c-${s.id}`} from={s.from + 18} durationInFrames={s.duration - 18} name={`callout ${s.id}`}>
            <Callout text={s.callout} tilt={i % 2 === 0 ? -4 : 3} />
          </Sequence>
        ) : null,
      )}

      {cta ? (
        <Sequence from={cta.from + cta.duration - CTA_HOLD} name="cta">
          <div
            style={{ position: 'absolute', left: 0, right: 0, top: 1290, display: 'flex', justifyContent: 'center' }}
          >
            <DomainCta tone={tone} look="pill" />
          </div>
        </Sequence>
      ) : null}

      {scenes.map((s, i) => (
        <React.Fragment key={`a-${s.id}`}>
          <Voiceover file={s.voiceover} from={s.from} duration={s.duration} />
          <Sfx file={i === 0 ? sfx.whoosh : sfx.swipe} at={s.from} volume={0.45} master={sfx.volume} />
          {s.callout ? <Sfx file={sfx.pop} at={s.from + 18} volume={0.45} master={sfx.volume} /> : null}
        </React.Fragment>
      ))}
      {cta ? (
        <DomainCtaSfx from={cta.from + cta.duration - CTA_HOLD} tick={sfx.tick} click={sfx.ding} master={sfx.volume} />
      ) : null}
      <Music file={props.music.file} volume={props.music.volume} />
    </AbsoluteFill>
  );
};

/** Glass badge floating over the phone's left edge (clear of the right action rail). */
const Callout: React.FC<{ text: string; tilt: number }> = ({ text, tilt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const tone = t.tone(0);
  const p = t.pop(frame, fps, 0);
  return (
    <div style={{ position: 'absolute', top: 1190, left: 44, scale: p, rotate: `${tilt}deg` }}>
      <Surface
        variant="glass"
        tone={tone}
        style={{ padding: '22px 30px', ...t.type('body', { weight: 700 }), fontSize: 38, color: tone.text }}
      >
        <span style={{ color: tone.accent }}>● </span>
        {text}
      </Surface>
    </div>
  );
};

const example = {
  brand: 'orbit',
  scenes: [
    {
      id: 'hook',
      headline: 'Freelance money, *finally* calm',
      say: '[confident] Freelance income is chaotic. Your money app should not be.',
      screen: { type: 'balance', label: 'Available', amount: 12480.5, delta: '+18% this month' },
      callout: 'Taxes set aside',
    },
    {
      id: 'chart',
      headline: 'See every *invoice* land',
      say: 'Watch every invoice land in real time.',
      screen: { type: 'chart', title: 'Income', value: 8240, points: [12, 18, 14, 26, 22, 34, 31, 44] },
      callout: 'Paid in 2 days',
    },
    {
      id: 'notify',
      headline: 'Paid? You will *know*',
      say: 'And get a ping the second a client pays.',
      screen: { type: 'notify', title: 'Invoice #041 paid', body: 'Studio Nord sent you $2,400.00' },
    },
    {
      id: 'cta',
      headline: 'Get Orbit *free*',
      say: '[warmly] Start free today.',
      screen: { type: 'splash' },
      cta: true,
    },
  ],
};

export default defineTemplate<Props>({
  id: 'AppPromo',
  description:
    'App/SaaS promo: tilting phone with live animated UI (balance · chart · notify · list · splash), headline per scene, glass callouts, typed CTA.',
  component: AppPromo,
  schema,
  defaultProps: schema.parse(example),
  example,
  durationInFrames: 600,
  calculateMetadata: async ({ props }) => {
    const r = await resolveScenes(props.scenes, VIDEO.fps, { tailPadding: config.voice?.tailPadding, extra, min: 2.8 });
    return { durationInFrames: r.durationInFrames, props: { ...props, scenes: r.scenes } };
  },
  stills: (props) =>
    placeScenes(props.scenes, VIDEO.fps, { extra, min: 2.8 }).map(
      (s) => s.from + Math.round(s.duration * (s.cta ? 0.93 : 0.65)),
    ),
});
