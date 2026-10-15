import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DocumentoClinico, TipoDocumentoClinico } from '../api/types';

const tipoLabel: Record<TipoDocumentoClinico, string> = {
  laudo: 'Laudo',
  declaracao: 'Declaração',
  atestado: 'Atestado',
  recibo: 'Recibo',
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmt = (iso: string) => format(new Date(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

// Nome de arquivo amigável: "Atestado-Maria-Silva.pdf"
const safeFileName = (doc: DocumentoClinico, patientName: string) => {
  const base = `${tipoLabel[doc.tipo]}-${patientName}`
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-zÀ-ÿ0-9-]/g, '');
  return `${base || 'documento'}.pdf`;
};

// Documento clínico em HTML (A4), seguindo a identidade Psiqui da versão web.
const buildHtml = (doc: DocumentoClinico, patientName: string) => {
  const emitidoPor = doc.assinado_por ?? doc.psicologo?.user?.name ?? 'Psicólogo(a)';
  const dataAssinatura = fmt(doc.assinado_em ?? doc.created_at);
  const extras = [
    doc.cid ? `<p style="margin:14px 0 0;"><strong>CID:</strong> ${esc(doc.cid)}</p>` : '',
    doc.dias_afastamento
      ? `<p style="margin:4px 0 0;"><strong>Afastamento:</strong> ${doc.dias_afastamento} dias</p>`
      : '',
  ].join('');

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8" />
<style>
  @page { margin: 40px; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #0F172A; font-size: 15px; }
  .header { display: flex; justify-content: space-between; align-items: flex-end;
            border-bottom: 2px solid #2563EB; padding-bottom: 14px; }
  .brand { font-size: 26px; font-weight: 800; color: #2563EB; margin: 0; }
  .brand-sub { font-size: 13px; color: #64748B; margin: 4px 0 0; }
  .meta { font-size: 12px; color: #64748B; text-align: right; line-height: 1.5; }
  .doc-type { text-align: center; text-transform: uppercase; letter-spacing: 1px;
              color: #2563EB; font-size: 19px; font-weight: 700; margin: 28px 0 22px; }
  .content { white-space: pre-line; line-height: 1.7; }
  .signature { margin-top: 56px; text-align: center; }
  .sig-line { border-top: 1px solid #0F172A; width: 280px; margin: 0 auto; padding-top: 8px; }
  .sig-name { font-weight: 700; margin: 0; }
  .sig-role { color: #64748B; font-size: 13px; margin: 2px 0 0; }
  .sig-date { color: #2563EB; font-size: 13px; margin: 14px 0 0; }
  .code { display: inline-block; margin-top: 14px; padding: 8px 16px; background: #F8FAFC;
          border: 1px solid #CBD5E1; border-radius: 10px; }
  .code-label { font-size: 11px; color: #64748B; margin: 0; }
  .code-value { font-size: 15px; font-weight: 700; letter-spacing: 1px; color: #1E3A8A; margin: 2px 0 0; }
  .footer { margin-top: 48px; border-top: 1px solid #E2E8F0; padding-top: 12px;
            text-align: center; font-size: 11px; color: #94A3B8; line-height: 1.6; }
</style></head><body>
  <div class="header">
    <div>
      <p class="brand">Psiqui</p>
      <p class="brand-sub">Plataforma de Psicologia Online</p>
    </div>
    <div class="meta">
      <div>Emitido em ${dataAssinatura}</div>
      <div>${esc(doc.titulo)}</div>
    </div>
  </div>

  <div class="doc-type">${tipoLabel[doc.tipo]}</div>

  <p style="margin:0 0 18px;"><strong>Paciente:</strong> ${esc(patientName)}</p>
  <div class="content">${esc(doc.conteudo)}</div>
  ${extras}

  <div class="signature">
    <div class="sig-line">
      <p class="sig-name">${esc(emitidoPor)}</p>
      <p class="sig-role">Psicólogo(a)</p>
    </div>
    <p class="sig-date">Assinado eletronicamente em ${dataAssinatura}</p>
    ${
      doc.codigo_verificacao
        ? `<div class="code"><p class="code-label">Código de verificação</p>
             <p class="code-value">${esc(doc.codigo_verificacao)}</p></div>`
        : ''
    }
  </div>

  <div class="footer">
    Documento gerado pela plataforma Psiqui.
    ${
      doc.codigo_verificacao
        ? `<br/>Verifique a autenticidade em psiqui.com.br/verificar com o código ${esc(doc.codigo_verificacao)}.`
        : ''
    }
  </div>
</body></html>`;
};

/**
 * Gera o PDF do documento clínico e abre a folha de compartilhamento
 * (WhatsApp, e-mail, salvar em arquivos, etc.) para o paciente enviar.
 */
const withTimeout = <T>(p: Promise<T>, ms: number, msg: string) =>
  Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);

export async function exportClinicalDocument(doc: DocumentoClinico, patientName: string) {
  // O expo-print renderiza via WebView; protegemos com timeout para a UI
  // nunca ficar presa caso o processo do WebView seja interrompido.
  const { uri } = await withTimeout(
    Print.printToFileAsync({ html: buildHtml(doc, patientName) }),
    20000,
    'Tempo esgotado ao gerar o PDF.'
  );

  // Renomeia o PDF (que sai com nome aleatório no cache) para algo legível.
  let shareUri = uri;
  try {
    const dest = new File(Paths.cache, safeFileName(doc, patientName));
    if (dest.exists) dest.delete();
    await new File(uri).move(dest);
    shareUri = dest.uri;
  } catch {
    shareUri = uri; // se o move falhar, compartilha o arquivo original mesmo
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartilhamento indisponível neste dispositivo.');
  }

  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    dialogTitle: `${tipoLabel[doc.tipo]} — ${doc.titulo}`,
    UTI: 'com.adobe.pdf',
  });
}
