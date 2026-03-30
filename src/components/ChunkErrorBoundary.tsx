import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    const isChunkError =
      error.name === "ChunkLoadError" ||
      error.message.includes("Failed to fetch dynamically imported module") ||
      error.message.includes("not a valid JavaScript MIME type") ||
      error.message.includes("Importing a module script failed");

    if (isChunkError) {
      // Reload once to pick up the new chunk URLs from the latest deploy
      const reloadKey = "chunk_reload_at";
      const last = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!last || now - Number(last) > 10_000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
      }
    }

    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
