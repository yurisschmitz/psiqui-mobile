import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/auth';
import { Avatar, Badge, Card } from '../../src/ui';
import { colors, font, radius, spacing } from '../../src/theme';

const MENU = [
  { icon: 'person-outline', label: 'Meu perfil', href: '/perfil' },
  { icon: 'document-text-outline', label: 'Documentos (laudos e atestados)', href: '/documentos' },
  { icon: 'card-outline', label: 'Pagamentos', href: '/pagamentos' },
  { icon: 'heart-outline', label: 'Diário de bem-estar', href: '/diario-bem-estar' },
  { icon: 'book-outline', label: 'Anotações do psicólogo', href: '/diario' },
  { icon: 'notifications-outline', label: 'Notificações', href: '/notificacoes' },
] as const;

export default function MoreScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={s.container}>
      <Text style={s.title}>Mais</Text>

      {/* Cartão do usuário */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={user?.name ?? '?'} size={54} />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{user?.name}</Text>
          <Text style={s.email}>{user?.email}</Text>
          <View style={{ marginTop: 6 }}>
            {user?.email_verified_at ? (
              <Badge label="E-mail verificado" tone="success" />
            ) : (
              <Badge label="E-mail não verificado" tone="warning" />
            )}
          </View>
        </View>
      </Card>

      {/* Menu */}
      <View style={s.menu}>
        {MENU.map(({ icon, label, href }, i) => (
          <Pressable
            key={href}
            onPress={() => router.push(href)}
            style={({ pressed }) => [s.menuItem, i < MENU.length - 1 && s.menuDivider, pressed && { backgroundColor: colors.bg }]}
          >
            <View style={s.menuIcon}>
              <Ionicons name={icon} size={20} color={colors.primary} />
            </View>
            <Text style={s.menuLabel}>{label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>

      <Pressable onPress={handleLogout} style={s.logout}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={s.logoutText}>Sair da conta</Text>
      </Pressable>

      <Text style={s.version}>Psiqui · app do paciente</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: spacing.xl, paddingTop: 64, gap: spacing.xl, paddingBottom: 48 },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  name: { fontWeight: '700', fontSize: font.body, color: colors.text },
  email: { color: colors.muted, fontSize: font.small, marginTop: 2 },
  menu: { backgroundColor: colors.card, borderRadius: radius.xl, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
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
