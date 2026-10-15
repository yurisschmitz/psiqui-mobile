import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api/client';
import { useAuth } from '../src/context/auth';
import { Avatar, Badge, Card, GradientButton, Input, OutlineButton } from '../src/ui';
import { colors, font, spacing } from '../src/theme';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [resending, setResending] = useState(false);
  const [nome, setNome] = useState(user?.name ?? '');
  const [telefone, setTelefone] = useState(user?.paciente?.telefone ?? '');
  const [salvando, setSalvando] = useState(false);
  const mudou = nome.trim() !== (user?.name ?? '') || telefone.trim() !== (user?.paciente?.telefone ?? '');

  const salvar = async () => {
    if (!nome.trim()) return Alert.alert('Nome vazio', 'Informe seu nome.');
    try {
      setSalvando(true);
      await api.put('/paciente/perfil', { name: nome.trim(), telefone: telefone.trim() || null });
      await refreshUser();
      Alert.alert('Pronto', 'Seus dados foram atualizados.');
    } catch (e: any) {
      Alert.alert('Não foi possível salvar', e?.message ?? 'Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

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

      <Card style={{ gap: spacing.md }}>
        <Text style={s.sectionTitle}>Dados da conta</Text>
        <Input label="Nome" value={nome} onChangeText={setNome} autoComplete="name" />
        <Input
          label="Telefone"
          placeholder="(00) 00000-0000"
          keyboardType="phone-pad"
          value={telefone}
          onChangeText={setTelefone}
          autoComplete="tel"
        />
        <View style={s.row}>
          <Ionicons name="mail-outline" size={18} color={colors.muted} />
          <Text style={s.rowLabel}>E-mail</Text>
          <Text style={s.rowValue} numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
        <GradientButton title="Salvar alterações" onPress={salvar} loading={salvando} disabled={!mudou} />
      </Card>

      <Text style={s.note}>Para trocar o e-mail, fale com o suporte em Mais → Ajuda e suporte.</Text>

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
