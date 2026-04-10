import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  reloading: boolean;
}

function safeSessionStorage(action: 'get' | 'set', key: string, value?: string): string | null {
  try {
    if (action === 'get') return sessionStorage.getItem(key);
    if (action === 'set' && value !== undefined) sessionStorage.setItem(key, value);
  } catch {}
  return null;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, reloading: false };

  static getDerivedStateFromError(error: Error): State {
    const msg = error.message || '';
    const name = error.name || '';

    const isChunkError =
      name === "ChunkLoadError" ||
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("not a valid JavaScript MIME type") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("Load failed") ||          // iOS Safari / Instagram WebView
      msg.includes("error loading dynamically imported module") ||
      msg.includes("Unable to preload CSS");

    if (isChunkError) {
      const reloadKey = "chunk_reload_at";
      const last = safeSessionStorage('get', reloadKey);
      const now = Date.now();
      if (!last || now - Number(last) > 15_000) {
        safeSessionStorage('set', reloadKey, String(now));
        try { window.location.reload(); } catch {}
      }
      return { hasError: false, reloading: true };
    }

    return { hasError: true, reloading: false };
  }

  render() {
    if (this.state.reloading) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #ccc', borderTop: '3px solid #16a34a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      );
    }

    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#fff', fontFamily: 'sans-serif' }}>
          <p style={{ color: '#555', marginBottom: 16 }}>Algo deu errado ao carregar a página.</p>
          <button
            onClick={() => { try { window.location.reload(); } catch {} }}
            style={{ padding: '10px 24px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15 }}
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
