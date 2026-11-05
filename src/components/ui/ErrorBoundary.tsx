import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
export class SceneErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Showroom failed to load', error, info); }
  render() { return this.state.error ? <div className="webgl-fallback"><h2>The studio couldn’t load.</h2><p>Check your connection and hardware acceleration, then try again.</p><button onClick={() => location.reload()}>Reload studio</button></div> : this.props.children; }
}
