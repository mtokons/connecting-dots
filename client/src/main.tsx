import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { loadApiConfig, refreshApiBase } from './utils/constants';

// Load runtime API config before rendering (no-op if missing)
loadApiConfig().then(() => {
  refreshApiBase();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
