import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError, errorMessage, setAccessToken } from './api';
import { sessionKey } from './auth';

/** A 401 that survived a refresh means the session is over, so the guard sends the user to log in. */
function endSessionOn401(error: Error) {
  if (error instanceof ApiError && error.status === 401) {
    setAccessToken(null);
    queryClient.setQueryData(sessionKey, null);
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: endSessionOn401 }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      endSessionOn401(error);
      // Forms that show their own errors set meta.toast to false.
      if (mutation.meta?.toast !== false) toast.error(errorMessage(error));
    },
  }),
  defaultOptions: {
    queries: {
      // Retrying only helps with network failures. API errors would fail the same way again.
      retry: (failureCount, error) => !(error instanceof ApiError) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
  },
});
