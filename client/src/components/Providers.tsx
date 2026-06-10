'use client';

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        document.documentElement.classList.add('light-mode');
        document.documentElement.classList.remove('dark');
      } else {
        document.body.classList.remove('light-mode');
        document.documentElement.classList.remove('light-mode');
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  return (
    <Provider store={store}>
      {children}
    </Provider>
  );
}

