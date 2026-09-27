import type { Template } from '../core/template';
import { explainer } from './Explainer';
import { kineticCaptions } from './KineticCaptions';
import { productSpotlight } from './ProductSpotlight';
import { topList } from './TopList';

/**
 * Every template Reelsmith can render. Root.tsx registers one Remotion
 * composition per entry; job files select one by `template: "<id>"`.
 * To add a template: create src/templates/<Id>/ and list it here.
 */
export const TEMPLATES: Template<any>[] = [productSpotlight, explainer, topList, kineticCaptions];
