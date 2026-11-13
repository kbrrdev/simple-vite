import { useState } from 'react';
import { FolderTreeIcon, MoreHorizontalIcon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { errorMessage } from '@/lib/api';
import { ListSkeleton } from '@/components/Loading';
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
  const hasChildren = category.children.length > 0;

  return (
    <li>
      <div className="flex items-center gap-3 border-t px-4 py-2">
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
        <span className="min-w-0 flex-1 truncate font-medium">{category.name}</span>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Edit ${category.name}`}
          onClick={() => onEdit(category)}
        >
          Edit
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${category.name}`}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            {depth < maxDepth && (
              <DropdownMenuItem className="min-h-11 md:min-h-8" onSelect={() => onAdd(category)}>
                Add subcategory
              </DropdownMenuItem>
            )}
            {hasChildren ? (
              <DropdownMenuItem disabled className="min-h-11 flex-col items-start gap-0 md:min-h-8">
                Delete
                <span className="text-xs text-muted-foreground">
                  Remove its subcategories first
                </span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                variant="destructive"
                className="min-h-11 md:min-h-8"
                onSelect={() => onDelete(category)}
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {hasChildren && (
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
      <PageHeader
        title="Categories"
        actions={<Button onClick={() => setEditing({})}>New category</Button>}
      />

      {tree.isPending && <ListSkeleton media />}

      {tree.isError && (
        <div className="space-y-4">
          <p role="alert">{errorMessage(tree.error)}</p>
          <Button variant="outline" onClick={() => tree.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {tree.data?.data.length === 0 && (
        <EmptyState
          icon={FolderTreeIcon}
          title="No categories yet"
          action={<Button onClick={() => setEditing({})}>New category</Button>}
        >
          Group products so shoppers can browse them.
        </EmptyState>
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
