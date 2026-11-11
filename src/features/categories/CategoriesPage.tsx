import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';
import { useCategoryTree, type CategoryNode } from './api';
import { CategoryFormDialog } from './CategoryFormDialog';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';
import { maxDepth } from './tree';

type Editing = { category?: CategoryNode; parentId?: string };

interface ItemProps {
  category: CategoryNode;
  depth: number;
  onAdd: (parent: CategoryNode) => void;
  onEdit: (category: CategoryNode) => void;
  onDelete: (category: CategoryNode) => void;
}

/** One category, with its subcategories in a nested list below it. */
function CategoryItem({ category, depth, onAdd, onEdit, onDelete }: ItemProps) {
  return (
    <li>
      <div className="flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {category.imageUrl ? (
            <img
              src={category.imageUrl}
              alt=""
              loading="lazy"
              className="size-10 shrink-0 rounded-md bg-muted object-cover"
            />
          ) : (
            <div className="size-10 shrink-0 rounded-md bg-muted" />
          )}
          <span className="truncate font-medium">{category.name}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {depth < maxDepth && (
            <Button
              variant="outline"
              size="sm"
              aria-label={`Add a subcategory to ${category.name}`}
              onClick={() => onAdd(category)}
            >
              Add subcategory
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            aria-label={`Edit ${category.name}`}
            onClick={() => onEdit(category)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={`Delete ${category.name}`}
            onClick={() => onDelete(category)}
          >
            Delete
          </Button>
        </div>
      </div>
      {category.children.length > 0 && (
        <ul aria-label={`Subcategories of ${category.name}`} className="pl-6">
          {category.children.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              depth={depth + 1}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function CategoriesPage() {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<CategoryNode | null>(null);
  const tree = useCategoryTree();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <Button onClick={() => setEditing({})}>New category</Button>
      </div>

      {tree.isPending && <p className="text-muted-foreground">Loading…</p>}

      {tree.isError && (
        <div className="space-y-4">
          <p role="alert">{errorMessage(tree.error)}</p>
          <Button variant="outline" onClick={() => tree.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {tree.data?.data.length === 0 && (
        <p className="text-muted-foreground">No categories yet. Create one to get started.</p>
      )}

      {tree.data && tree.data.data.length > 0 && (
        <ul
          aria-label="Categories"
          className="overflow-hidden rounded-lg border [&>li:first-child>div]:border-t-0"
        >
          {tree.data.data.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              depth={1}
              onAdd={(parent) => setEditing({ parentId: parent.id })}
              onEdit={(category) => setEditing({ category })}
              onDelete={setDeleting}
            />
          ))}
        </ul>
      )}

      {editing && tree.data && (
        <CategoryFormDialog
          tree={tree.data.data}
          category={editing.category}
          parentId={editing.parentId}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && <DeleteCategoryDialog category={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}
