import React, { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useClinicalDocuments } from '../src/api/hooks';
import { useAuth } from '../src/context/auth';
import type { DocumentoClinico, TipoDocumentoClinico } from '../src/api/types';
import { exportClinicalDocument } from '../src/utils/documentPdf';
import { Badge, EmptyState, GradientButton, OutlineButton, Skeleton } from '../src/ui';
import { colors, font, radius, shadow, spacing } from '../src/theme';

const tipoLabel: Record<TipoDocumentoClinico, string> = {
  laudo: 'Laudo',
  declaracao: 'Declaração',
  atestado: 'Atestado',
  recibo: 'Recibo',
};

const tipoIcon: Record<TipoDocumentoClinico, keyof typeof Ionicons.glyphMap> = {
  laudo: 'medkit-outline',
  declaracao: 'clipboard-outline',
  atestado: 'document-text-outline',
  recibo: 'receipt-outline',
};

export default function DocumentsScreen() {
  const { data: docs, isLoading, refetch, isRefetching } = useClinicalDocuments();
  const { user } = useAuth();
  const [viewing, setViewing] = useState<DocumentoClinico | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);

  const handleExport = async (doc: DocumentoClinico) => {
    try {
      setExportingId(doc.id);
      await exportClinicalDocument(doc, user?.name ?? 'Paciente');
    } catch (e) {
      Alert.alert('Não foi possível exportar', 'Tente novamente em instantes.');
    } finally {
      setExportingId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {isLoading ? (
        <View style={{ padding: spacing.xl, gap: spacing.md }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={84} />
          ))}
        </View>
      ) : (
        <FlatList
          data={docs ?? []}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: 32 }}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="Nenhum documento"
              subtitle="Laudos, declarações e atestados emitidos pelo seu psicólogo aparecem aqui."
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => setViewing(item)} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}>
              <View style={s.icon}>
                <Ionicons name={tipoIcon[item.tipo]} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.docTitle} numberOfLines={1}>
                  {item.titulo}
                </Text>
                <Text style={s.docMeta}>
                  {item.psicologo?.user?.name} · {format(new Date(item.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </Text>
                <Badge label={tipoLabel[item.tipo]} tone="primary" />
              </View>
              <Pressable
                onPress={() => handleExport(item)}
                disabled={exportingId === item.id}
                hitSlop={8}
                style={({ pressed }) => [s.shareBtn, pressed && { opacity: 0.6 }]}
                accessibilityLabel="Exportar e compartilhar documento"
              >
                <Ionicons
                  name={exportingId === item.id ? 'hourglass-outline' : 'share-outline'}
                  size={20}
                  color={colors.primary}
                />
              </Pressable>
            </Pressable>
          )}
        />
      )}

      {/* Visualização do documento */}
      <Modal visible={!!viewing} animationType="slide" onRequestClose={() => setViewing(null)}>
        {viewing && (
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={s.modalHeader}>
              <Pressable onPress={() => setViewing(null)} hitSlop={10} style={s.closeBtn}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
              <Badge label={tipoLabel[viewing.tipo]} tone="primary" />
            </View>
            <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, paddingBottom: 48 }}>
              <Text style={s.modalTitle}>{viewing.titulo}</Text>
              <Text style={s.modalMeta}>
                Emitido por {viewing.assinado_por ?? viewing.psicologo?.user?.name} em{' '}
                {format(new Date(viewing.assinado_em ?? viewing.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Text>

              <View style={s.content}>
                <Text style={s.contentText}>{viewing.conteudo}</Text>
                {viewing.cid ? <Text style={[s.contentText, { marginTop: spacing.md, fontWeight: '700' }]}>CID: {viewing.cid}</Text> : null}
                {viewing.dias_afastamento ? (
                  <Text style={[s.contentText, { fontWeight: '700' }]}>Afastamento: {viewing.dias_afastamento} dias</Text>
                ) : null}
              </View>

              {viewing.codigo_verificacao && (
                <View style={s.verification}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.verificationLabel}>Documento assinado eletronicamente</Text>
                    <Text style={s.verificationCode}>Código de verificação: {viewing.codigo_verificacao}</Text>
                  </View>
                </View>
              )}

              <GradientButton
                title="Exportar / Compartilhar PDF"
                icon="share-outline"
                loading={exportingId === viewing.id}
                onPress={() => handleExport(viewing)}
              />
              <Text style={s.exportHint}>
                Gera um PDF assinado para enviar à empresa, RH ou onde precisar.
              </Text>
              <OutlineButton title="Fechar" onPress={() => setViewing(null)} />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.card,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: { fontWeight: '700', color: colors.text, fontSize: font.body },
  docMeta: { color: colors.muted, fontSize: font.small },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportHint: { color: colors.muted, fontSize: font.small, textAlign: 'center', marginTop: -spacing.sm },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  modalTitle: { fontSize: font.title, fontWeight: '800', color: colors.text },
  modalMeta: { color: colors.muted, fontSize: font.small, marginTop: -spacing.sm },
  content: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, ...shadow.card },
  contentText: { color: colors.text, lineHeight: 24, fontSize: font.body },
  verification: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.successBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  verificationLabel: { fontWeight: '700', color: colors.success, fontSize: font.small },
  verificationCode: { color: colors.muted, fontSize: font.tiny, marginTop: 2 },
});
