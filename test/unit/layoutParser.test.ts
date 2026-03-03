import { describe, expect, it } from 'vitest';

import { extractLayoutNames } from '../../src/utils/layoutParser';

describe('extractLayoutNames', () => {
  it('returns names from flat layout arrays', () => {
    const result = extractLayoutNames([
      { name: 'Assets_List' },
      { name: 'Assets_Detail' }
    ]);

    expect(result).toEqual(['Assets_List', 'Assets_Detail']);
  });

  it('flattens folderLayoutNames child layouts', () => {
    const result = extractLayoutNames([
      {
        name: 'Assets',
        folderLayoutNames: [{ name: 'Asset_List' }, { name: 'Asset_Detail' }]
      }
    ]);

    expect(result).toEqual(['Asset_List', 'Asset_Detail']);
  });

  it('supports string child layout values and de-duplicates', () => {
    const result = extractLayoutNames([
      {
        name: 'Assets',
        folderLayoutNames: ['Asset_List', 'Asset_Detail']
      },
      { name: 'Asset_List' }
    ]);

    expect(result).toEqual(['Asset_List', 'Asset_Detail']);
  });

  it('supports folder markers with nested layouts', () => {
    const result = extractLayoutNames([
      {
        name: 'Assets',
        isFolder: true,
        layouts: [{ layoutName: 'Asset_Record' }, { displayName: 'Asset_Edit' }]
      }
    ]);

    expect(result).toEqual(['Asset_Record', 'Asset_Edit']);
  });
});
