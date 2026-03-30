import { createRoot } from 'react-dom/client';
import { useState, useEffect, lazy, Suspense } from 'react';
import App from './App';

const ToonAdmin = lazy(() => import('./pages/ToonAdmin'));
const Arena = lazy(() => import('./pages/Arena'));
const BabylonPlayground = lazy(() => import('./pages/BabylonPlayground'));
const RetargetPage = lazy(() => import('./pages/RetargetPage'));

const LOADING_SCREEN = (
  <div style={{
    color: '#c5a059', background: '#0a0a1a', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Oxanium', sans-serif",
  }}>Loading...</div>
);

function Root() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (path === '/toonadmin') {
    return (
      <Suspense fallback={LOADING_SCREEN}>
        <ToonAdmin />
      </Suspense>
    );
  }

  if (path === '/arena') {
    return (
      <Suspense fallback={LOADING_SCREEN}>
        <Arena />
      </Suspense>
    );
  }

  if (path === '/playground') {
    return (
      <Suspense fallback={LOADING_SCREEN}>
        <BabylonPlayground />
      </Suspense>
    );
  }

  if (path === '/retarget') {
    return (
      <Suspense fallback={LOADING_SCREEN}>
        <RetargetPage />
      </Suspense>
    );
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(<Root />);
