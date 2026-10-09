import { describe, expect, it } from 'vitest';
import {
  findResourceContext,
  flattenResources,
  getRelatedResources,
  isSafeHttpsUrl,
  searchResources,
  validateCatalogue
} from '../../client/src/features/osintUniverse/analysis';
import { osintCategories, osintRoot } from '../../client/src/features/osintUniverse/catalogue';

describe('OSINT Universe catalogue', () => {
  it('contains ten uniquely identified category nodes and a valid nested catalogue', () => {
    expect(osintCategories).toHaveLength(10);
    expect(validateCatalogue(osintRoot)).toEqual([]);
    const ids = flattenResources(osintRoot).map((resource) => resource.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves category and subcategory context for lazily expanded resources', () => {
    const context = findResourceContext(osintRoot, 'crt-sh');
    expect(context?.category?.id).toBe('domain');
    expect(context?.subcategory?.id).toBe('certificate-transparency');
    expect(context?.resource.name).toBe('crt.sh');
  });

  it('searches names, descriptions, tags, categories, and use cases', () => {
    expect(searchResources(osintRoot, 'certificate transparency').map((item) => item.id))
      .toContain('crt-sh');
    expect(searchResources(osintRoot, 'routing').map((item) => item.id))
      .toContain('ripestat');
    expect(searchResources(osintRoot, '   ')).toEqual([]);
  });

  it('provides sibling resources as navigable related entries', () => {
    const relatedIds = getRelatedResources(osintRoot, 'shodan').map((item) => item.id);
    expect(relatedIds).toContain('censys');
    expect(relatedIds).not.toContain('shodan');
  });

  it('handles learning concepts without invented external links', () => {
    const context = findResourceContext(osintRoot, 'forensic-hashing');
    expect(context?.resource.officialUrl).toBeUndefined();
    expect(context?.resource.githubUrl).toBeUndefined();
    expect(context?.resource.documentationUrl).toBeUndefined();
  });

  it('only allows HTTPS external links without embedded credentials', () => {
    expect(isSafeHttpsUrl('https://example.org/docs')).toBe(true);
    expect(isSafeHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpsUrl('https://user:password@example.org')).toBe(false);
    expect(isSafeHttpsUrl(undefined)).toBe(false);
  });

  it('rejects invalid catalogue URLs and references to missing resources', () => {
    const malformedCatalogue = structuredClone(osintRoot);
    const firstResource = malformedCatalogue.children?.[0].children?.[0].children?.[0];
    if (!firstResource) throw new Error('Expected a seeded resource to mutate for this test.');
    firstResource.officialUrl = 'javascript:alert(1)';
    firstResource.relatedResourceIds = ['missing-resource'];

    const errors = validateCatalogue(malformedCatalogue);
    expect(errors.some((error) => error.includes('unsafe or invalid URL'))).toBe(true);
    expect(errors.some((error) => error.includes('missing resource'))).toBe(true);
  });
});
