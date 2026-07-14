export const STATUS_COLORS = {
  hot: { light: '#e34948', dark: '#e66767' },
  warm: { light: '#eb6834', dark: '#d95926' },
  cold: { light: '#2a78d6', dark: '#3987e5' },
}

export const SEQUENTIAL_BLUE = { light: '#2a78d6', dark: '#3987e5' }
export const SEQUENTIAL_AQUA = { light: '#1baf7a', dark: '#199e70' }

export const CHART_INK = {
  primary: { light: '#0b0b0b', dark: '#ffffff' },
  secondary: { light: '#52514e', dark: '#c3c2b7' },
  muted: { light: '#898781', dark: '#898781' },
  grid: { light: '#e1e0d9', dark: '#2c2c2a' },
}

export function pick(role, isDark) {
  return isDark ? role.dark : role.light
}
