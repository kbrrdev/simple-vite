import type { CategoryNode } from '@/features/categories/api';
import type { Product, ProductVariant } from './api';

const date = '2026-11-01T00:00:00.000Z';

export function makeVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: 'variant-1',
    productId: 'product-1',
    option1Value: null,
    option2Value: null,
    assetId: null,
    priceCents: 45000,
    stock: 10,
    active: true,
    createdAt: date,
    updatedAt: date,
    ...overrides,
  };
}

/** A product as the admin API returns it, with the given fields changed. */
export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    categoryId: 'cat-shoes',
    name: 'Trail Runner',
    description: 'Light and quick.',
    option1Name: null,
    option2Name: null,
    active: true,
    createdAt: date,
    updatedAt: date,
    images: [],
    variants: [makeVariant()],
    ...overrides,
  };
}

function node(id: string, name: string, children: CategoryNode[] = []): CategoryNode {
  return {
    id,
    parentId: null,
    name,
    imageAssetId: null,
    imageUrl: null,
    createdAt: date,
    updatedAt: date,
    children,
  };
}

/** Men › Shoes, and Women. */
export const categoryTree = [
  node('cat-men', 'Men', [node('cat-shoes', 'Shoes')]),
  node('cat-women', 'Women'),
];
