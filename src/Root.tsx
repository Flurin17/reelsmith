import React from 'react';
import { Composition } from 'remotion';
import { BrandProvider, baseBrand } from './brand/context';
import { FontGate } from './brand/fonts';
import type { BrandOverride } from './brand/types';
import { Auditor } from './core/audit';
import { VIDEO, type Template } from './core/template';
import { TEMPLATES } from './templates';

/**
 * Wrap a template so its optional `brand` prop overrides the config brand, and
 * so `reelsmith review` can audit frames (input prop `__audit: true`).
 */
function branded(template: Template<any>): React.FC<any> {
  const Inner = template.component;
  const Branded: React.FC<Record<string, unknown>> = (props) => (
    <FontGate brand={baseBrand}>
      <BrandProvider override={props.brand as BrandOverride | undefined}>
        <Auditor enabled={props.__audit === true}>
          <Inner {...props} />
        </Auditor>
      </BrandProvider>
    </FontGate>
  );
  Branded.displayName = `Branded(${template.id})`;
  return Branded;
}

const COMPONENTS = new Map(TEMPLATES.map((t) => [t.id, branded(t)]));

export const RemotionRoot: React.FC = () => (
  <>
    {TEMPLATES.map((t) => (
      <Composition
        key={t.id}
        id={t.id}
        component={COMPONENTS.get(t.id)!}
        schema={t.schema as any}
        defaultProps={t.defaultProps as any}
        durationInFrames={t.durationInFrames}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
        calculateMetadata={t.calculateMetadata as any}
      />
    ))}
  </>
);
