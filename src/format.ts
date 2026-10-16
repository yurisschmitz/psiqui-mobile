import { BASE_URL } from './api/client';
// Formatos iguais aos da web (src/lib/utils/formatters.ts e src/lib/preco.ts).

/** CRP no padrão XX/XXXXXX. */
export const formatCRP = (crp?: string | null): string => {
  const n = (crp ?? '').replace(/\D/g, '').slice(0, 8);
  return n.length <= 2 ? n : `${n.slice(0, 2)}/${n.slice(2)}`;
};

/** URL absoluta de arquivo do storage público: `<origem da API>/storage/<caminho>`. */
export const storageUrl = (path?: string | null): string | null => {
  if (!path) return null;
  const origin = BASE_URL.match(/^https?:\/\/[^/]+/)?.[0] ?? '';
  return `${origin}/storage/${path.replace(/^\//, '')}`;
};

/** Valor padrão que o back cobra quando o psicólogo não definiu preço. */
export const VALOR_SESSAO_PADRAO = 70;

export const formatBRL = (v: number | string | null | undefined): string =>
  `R$ ${Number(v ?? VALOR_SESSAO_PADRAO).toFixed(2).replace('.', ',')}`;

/** Só a primeira letra em maiúscula ("quinta, 15 de out"), sem o Title Case do textTransform. */
export const capitalizar = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);
