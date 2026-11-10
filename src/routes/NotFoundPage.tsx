import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link to="/" className="text-sm underline">
        Back to the dashboard
      </Link>
    </div>
  );
}
