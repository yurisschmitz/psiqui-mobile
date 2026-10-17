import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/context/auth';
import { usePerfilPsi } from '../../../src/api/psi';
import { Avatar, Badge, Card, useTopPad } from '../../../src/ui';
import { formatCRP, storageUrl } from '../../../src/format';
import { colors, font, radius, spacing } from '../../../src/theme';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://psiqui.com.br';

const MENU = [
  { icon: 'person-outline', label: 'Perfil profissional', href: '/psi/perfil' },
  { icon: 'notifications-outline', label: 'Notificações', href: '/notificacoes' },
  { icon: 'lock-closed-outline', label: 'Alterar senha', href: '/senha' },
  { icon: 'help-buoy-outline', label: 'Ajuda e suporte', href: '/suporte' },
] as const;

export default function PsiMais() {
  const topPad = useTopPad();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data } = usePerfilPsi();

  const sair = () =>
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout() },
    ]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={[s.container, { paddingTop: topPad }]}>
      <Text style={s.title}>Mais</Text>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={user?.name ?? '?'} size={54} uri={storageUrl(data?.perfil?.foto_perfil)} />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{user?.name}</Text>
          {data?.psicologo?.crp ? <Text style={s.email}>CRP {formatCRP(data.psicologo.crp)}</Text> : null}
          <View style={{ marginTop: 6 }}>
            <Badge label="Perfil aprovado" tone="success" />
          </View>
        </View>
      </Card>

      <View style={s.menu}>
        {MENU.map(({ icon, label, href }, i) => (
          <Pressable
            key={href}
            onPress={() => router.push(href)}
            style={({ pressed }) => [s.menuItem, i > 0 && s.menuDivider, pressed && { backgroundColor: colors.bg }]}
          >
            <View style={s.menuIcon}>
              <Ionicons name={icon} size={20} color={colors.primary} />
            </View>
            <Text style={s.menuLabel}>{label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>

      {/* O que ainda é só da web: documentos clínicos, Google Agenda, dados bancários, fotos. */}
      <Pressable onPress={() => Linking.openURL(`${WEB_URL}/psychologist-dashboard`)}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={s.menuIcon}>
            <Ionicons name="desktop-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.menuLabel}>Painel completo no site</Text>
            <Text style={s.email}>Documentos clínicos, Google Agenda e dados de recebimento</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.muted} />
        </Card>
      </Pressable>

      <Pressable onPress={sair} style={s.logout}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={s.logoutText}>Sair da conta</Text>
      </Pressable>

      <Text style={s.version}>Psiqui · área do psicólogo</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.xl, paddingBottom: 48 },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  name: { fontWeight: '700', fontSize: font.body, color: colors.text },
  email: { color: colors.muted, fontSize: font.small, marginTop: 2 },
  menu: { backgroundColor: colors.card, borderRadius: radius.xl, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  menuDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontWeight: '600', color: colors.text, fontSize: font.body },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerBg,
  },
  logoutText: { color: colors.danger, fontWeight: '700' },
  version: { textAlign: 'center', color: colors.muted, fontSize: font.tiny },
});
