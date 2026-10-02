import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './app/auth-context';
import { App } from './app/routes';
import { WorkspaceProvider } from './app/workspace-context';
import './styles/globals.css';
import '@xyflow/react/dist/style.css';

const query = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10_000 },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root mount element #root is missing from index.html');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={query}>
      <AuthProvider>
        <WorkspaceProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </WorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
