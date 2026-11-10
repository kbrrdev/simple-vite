import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { errorMessage } from '@/lib/api';
import { pageSize, useCategories, type Category } from './api';
import { CategoryFormDialog } from './CategoryFormDialog';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

export function CategoriesPage() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const categories = useCategories(page);

  const totalPages = Math.max(1, Math.ceil((categories.data?.meta.total ?? 0) / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <Button onClick={() => setEditing('new')}>New category</Button>
      </div>

      {categories.isPending && <p className="text-muted-foreground">Loading…</p>}

      {categories.isError && (
        <div className="space-y-4">
          <p role="alert">{errorMessage(categories.error)}</p>
          <Button variant="outline" onClick={() => categories.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {categories.data?.meta.total === 0 && (
        <p className="text-muted-foreground">No categories yet. Create one to get started.</p>
      )}

      {categories.data && categories.data.meta.total > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Last updated</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.data.data.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{dateFormat.format(new Date(category.updatedAt))}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Rename ${category.name}`}
                      onClick={() => setEditing(category)}
                    >
                      Rename
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Delete ${category.name}`}
                      onClick={() => setDeleting(category)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <nav aria-label="Pagination" className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || categories.isPlaceholderData}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </nav>
        </>
      )}

      {editing && (
        <CategoryFormDialog
          category={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && <DeleteCategoryDialog category={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}
