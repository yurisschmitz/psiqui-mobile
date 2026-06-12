import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api/client';
import { useAuth } from '../src/context/auth';
import { Avatar, Badge, Card, OutlineButton } from '../src/ui';
import { colors, font, spacing } from '../src/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [resending, setResending] = useState(false);

  const resendVerification = async () => {
    try {
      setResending(true);
      const res = await api.post<{ message: string }>('/email/reenviar-verificacao');
      Alert.alert('Pronto!', res.message ?? 'E-mail de verificação reenviado.');
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Tente novamente em instantes.');
    } finally {
      setResending(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={s.container}>
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <Avatar name={user?.name ?? '?'} size={88} />
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={s.name}>{user?.name}</Text>
          <Text style={s.email}>{user?.email}</Text>
          {user?.email_verified_at ? (
            <Badge label="E-mail verificado ✓" tone="success" />
          ) : (
            <Badge label="E-mail não verificado" tone="warning" />
          )}
        </View>
      </View>

      {!user?.email_verified_at && (
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="mail-unread-outline" size={20} color={colors.warning} />
            <Text style={s.verifyTitle}>Confirme seu e-mail</Text>
          </View>
          <Text style={s.verifyText}>
            Enviamos um link de confirmação para {user?.email}. Verifique sua caixa de entrada e o spam.
          </Text>
          <OutlineButton title="Reenviar e-mail de verificação" onPress={resendVerification} loading={resending} />
        </Card>
      )}

      <Card style={{ gap: spacing.lg }}>
        <Text style={s.sectionTitle}>Dados da conta</Text>
        {[
          { icon: 'person-outline' as const, label: 'Nome', value: user?.name ?? '—' },
          { icon: 'mail-outline' as const, label: 'E-mail', value: user?.email ?? '—' },
          { icon: 'shield-checkmark-outline' as const, label: 'Tipo de conta', value: 'Paciente' },
        ].map(({ icon, label, value }) => (
          <View key={label} style={s.row}>
            <Ionicons name={icon} size={18} color={colors.muted} />
            <Text style={s.rowLabel}>{label}</Text>
            <Text style={s.rowValue} numberOfLines={1}>
              {value}
            </Text>
          </View>
        ))}
      </Card>

      <Text style={s.note}>
        Para alterar seus dados cadastrais ou redefinir a senha, use a opção "Esqueci a senha" na tela de login ou
        entre em contato com o suporte.
      </Text>

      <OutlineButton
        title="Sair da conta"
        icon="log-out-outline"
        onPress={() =>
          Alert.alert('Sair', 'Deseja sair da sua conta?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sair', style: 'destructive', onPress: () => logout() },
          ])
        }
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.xl, paddingBottom: 48 },
  name: { fontSize: font.title, fontWeight: '800', color: colors.text },
  email: { color: colors.muted },
  verifyTitle: { fontWeight: '700', color: colors.text },
  verifyText: { color: colors.muted, fontSize: font.small, lineHeight: 20 },
  sectionTitle: { fontWeight: '800', color: colors.text, fontSize: font.body },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowLabel: { color: colors.muted, fontSize: font.small, width: 100 },
  rowValue: { flex: 1, fontWeight: '600', color: colors.text, textAlign: 'right' },
  note: { color: colors.muted, fontSize: font.tiny, textAlign: 'center', lineHeight: 18 },
});
