import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">This page does not exist, or its link has changed.</p>
      <Button variant="outline" asChild>
        <Link to="/">Back to the dashboard</Link>
      </Button>
    </div>
  );
}
