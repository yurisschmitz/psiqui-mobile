/**
 * Design system do app Psiqui — espelha a identidade da plataforma web:
 * azul (#2563EB) → ciano (#06B6D4), cards arredondados, fundo claro suave.
 */
export const colors = {
  primary: '#2563EB',
  primaryDark: '#1E40AF',
  cyan: '#06B6D4',
  bg: '#F6F8FC',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  primarySoft: '#EFF6FF',
};

/** Gradiente da marca (usar com expo-linear-gradient). */
export const brandGradient = ['#2563EB', '#0EA5E9', '#06B6D4'] as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const font = {
  title: 24,
  subtitle: 18,
  body: 15,
  small: 13,
  tiny: 11,
};

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  brand: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
};
