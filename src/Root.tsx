import React from 'react';
import { Composition } from 'remotion';
import { Auditor } from './core/audit';
import { VIDEO, type Template } from './core/template';
import { TEMPLATES } from './templates';
import { ThemeProvider, getTheme } from './theme/context';
import { FontGate } from './theme/fonts';

/**
 * Wrap a template with its brand (props.brand → brands/<id>/theme.ts), the
 * brand's fonts, and the frame auditor used by `reelsmith review`.
 */
function branded(template: Template<any>): React.FC<any> {
  const Inner = template.component;
  const Branded: React.FC<Record<string, unknown>> = (props) => {
    const brand = typeof props.brand === 'string' ? props.brand : undefined;
    return (
      <FontGate theme={getTheme(brand)}>
        <ThemeProvider brand={brand}>
          <Auditor enabled={props.__audit === true} brand={brand}>
            <Inner {...props} />
          </Auditor>
        </ThemeProvider>
      </FontGate>
    );
  };
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
