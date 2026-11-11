import type { Blog } from './api';

/** A post as the admin API returns it, with the given fields changed. */
export function makeBlog(overrides: Partial<Blog> = {}): Blog {
  return {
    id: 'b1',
    title: 'New season shoes',
    content: '## Fresh in\n\nOur **trail runners** are back.',
    author: 'Juan',
    published: true,
    coverAssetId: 'asset-cover',
    coverImageUrl: 'https://cdn.example.com/cover.jpg',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-02T00:00:00.000Z',
    ...overrides,
  };
}
