import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import { env } from '@/config/env';
import { queryClient } from '@/lib/query-client';
import { router } from '@/routes/router';
import '@/styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('The #root element is missing from index.html.');

document.title = env.storeName;

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors />
    </QueryClientProvider>
  </StrictMode>,
);
