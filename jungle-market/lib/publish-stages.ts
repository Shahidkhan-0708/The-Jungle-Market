import type {Draft} from './workflow';

export const publishStages = [
  'Photograph your craft',
  'Enhance the photo',
  'Identify category and materials',
  'Measure dimensions',
  'Record and review your story',
  'Set a fair price',
  'Review the listing',
  'AI review and publish'
] as const;

export const costStatement = (d: Draft) => d.transcript.trim() || (d.translation_approved ? d.translation : '');

export function fillCraftSuggestions(d: Draft, result: Pick<Draft, 'title' | 'category' | 'materials' | 'region'>): Draft {
  return {
    ...d,
    title: d.title.trim() ? d.title : result.title,
    category: d.category.trim() ? d.category : result.category,
    materials: d.materials.trim() ? d.materials : result.materials,
    region: d.region.trim() ? d.region : result.region
  };
}

export function stageError(step: number, d: Draft): string {
  if (step === 3 && (!d.title?.trim() || !d.category?.trim())) return 'Complete the craft name and category.';
  if (step === 6 && (Number(d.price) <= 0)) return 'Set a fair price for your craft.';
  return '';
}
