export type Labels = Record<string, string>

declare module 'claude-code' {
  interface PluginState {
    'turn-duration': { labels: Labels }
  }
}
