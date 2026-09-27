/**
 * Template registry. Add a template: create src/templates/<Id>/index.tsx
 * (default-export defineTemplate({...})) and add one line below.
 */
import type { Template } from '../core/template';
import AppPromo from './AppPromo';
import Explainer from './Explainer';
import KineticCaptions from './KineticCaptions';
import ProductSpotlight from './ProductSpotlight';
import TopList from './TopList';

export const TEMPLATES: Template<any>[] = [ProductSpotlight, Explainer, TopList, KineticCaptions, AppPromo];
