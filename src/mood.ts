import type { HumorTipo } from './api/types';
import { colors } from './theme';

export type MoodTone = 'positive' | 'neutral' | 'negative';

export interface MoodConfig {
  tipo: HumorTipo;
  emoji: string;
  tone: MoodTone;
}

/** Humores do check-in — espelha a paleta emocional da plataforma web. */
export const MOODS: MoodConfig[] = [
  { tipo: 'Ótimo', emoji: '😄', tone: 'positive' },
  { tipo: 'Bem', emoji: '🙂', tone: 'positive' },
  { tipo: 'Neutro', emoji: '😐', tone: 'neutral' },
  { tipo: 'Cansado', emoji: '😴', tone: 'negative' },
  { tipo: 'Estressado', emoji: '😣', tone: 'negative' },
  { tipo: 'Triste', emoji: '😢', tone: 'negative' },
  { tipo: 'Ansioso', emoji: '😟', tone: 'negative' },
];

export const getMood = (tipo?: string | null): MoodConfig | undefined =>
  MOODS.find((m) => m.tipo === tipo);

/** Cor de acento por tom (borda esquerda do card de entrada do diário). */
export const moodToneColor = (tone: MoodTone): string => {
  switch (tone) {
    case 'positive':
      return colors.success;
    case 'negative':
      return colors.warning;
    default:
      return colors.border;
  }
};

/** Data local (do dispositivo) em YYYY-MM-DD. */
export const localDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
