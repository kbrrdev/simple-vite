import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { env } from '@/config/env';
import { ApiError, errorMessage } from '@/lib/api';
import { useLogin, useSession } from '@/lib/auth';

function loginError(error: Error) {
  if (error instanceof ApiError && error.status === 429) {
    return 'Too many attempts. Wait a few minutes, then try again.';
  }
  return errorMessage(error);
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const session = useSession();
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (session.data) return <Navigate to={from} replace />;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => navigate(from, { replace: true }) });
  }

  const fieldError = (field: string) =>
    login.error instanceof ApiError
      ? login.error.details.find((detail) => detail.field === field)?.message
      : undefined;

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>{env.storeName}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              {fieldError('email') && (
                <p className="text-sm text-destructive">{fieldError('email')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {fieldError('password') && (
                <p className="text-sm text-destructive">{fieldError('password')}</p>
              )}
            </div>
            {login.error && !fieldError('email') && !fieldError('password') && (
              <p role="alert" className="text-sm text-destructive">
                {loginError(login.error)}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={login.isPending || !email || !password}
            >
              {login.isPending ? 'Logging in…' : 'Log in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
