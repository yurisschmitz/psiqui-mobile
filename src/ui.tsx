import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandGradient, colors, font, radius, shadow, spacing } from './theme';

// ---------- Botões ----------
interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

/** Botão primário com o gradiente da marca. */
export const GradientButton: React.FC<ButtonProps> = ({ title, onPress, loading, disabled, icon, style }) => (
  <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [{ opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }, style]}>
    <LinearGradient colors={[...brandGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.btn, !disabled && shadow.brand]}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={s.btnRow}>
          {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
          <Text style={s.btnText}>{title}</Text>
        </View>
      )}
    </LinearGradient>
  </Pressable>
);

/** Botão secundário (contorno). */
export const OutlineButton: React.FC<ButtonProps> = ({ title, onPress, loading, disabled, icon, style }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || loading}
    style={({ pressed }) => [s.btn, s.btnOutline, { opacity: pressed || disabled ? 0.6 : 1 }, style]}
  >
    {loading ? (
      <ActivityIndicator color={colors.primary} />
    ) : (
      <View style={s.btnRow}>
        {icon ? <Ionicons name={icon} size={18} color={colors.primary} /> : null}
        <Text style={[s.btnText, { color: colors.primary }]}>{title}</Text>
      </View>
    )}
  </Pressable>
);

// ---------- Input ----------
interface InputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export const Input: React.FC<InputProps> = ({ label, icon, rightIcon, onRightIconPress, style, ...props }) => (
  <View style={{ gap: 6 }}>
    {label ? <Text style={s.label}>{label}</Text> : null}
    <View style={s.inputWrap}>
      {icon ? <Ionicons name={icon} size={18} color={colors.muted} style={{ marginLeft: spacing.md }} /> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[s.input, style]}
        {...props}
      />
      {rightIcon ? (
        <Pressable onPress={onRightIconPress} hitSlop={10} style={{ paddingHorizontal: spacing.md }}>
          <Ionicons name={rightIcon} size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  </View>
);

// ---------- Containers ----------
export const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[s.card, style]}>{children}</View>
);

export const SectionTitle: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <View style={s.sectionRow}>
    <Text style={s.sectionTitle}>{title}</Text>
    {action}
  </View>
);

/** Espaço do topo = barra de status real do aparelho (notch/câmera variam) + respiro. */
export const useTopPad = (extra = spacing.lg) => useSafeAreaInsets().top + extra;

// ---------- Badges / Avatar ----------
type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'muted';
const toneStyles: Record<Tone, { bg: string; fg: string }> = {
  primary: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.successBg, fg: colors.success },
  warning: { bg: colors.warningBg, fg: '#B45309' },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  muted: { bg: '#F1F5F9', fg: colors.muted },
};

export const Badge: React.FC<{ label: string; tone?: Tone }> = ({ label, tone = 'muted' }) => (
  <View style={[s.badge, { backgroundColor: toneStyles[tone].bg }]}>
    <Text style={[s.badgeText, { color: toneStyles[tone].fg }]}>{label}</Text>
  </View>
);

export const Avatar: React.FC<{ name: string; size?: number; uri?: string | null }> = ({
  name,
  size = 44,
  uri,
}) => {
  const [falhou, setFalhou] = useState(false);
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri && !falhou) {
    return <Image source={{ uri }} style={[s.avatar, box]} onError={() => setFalhou(true)} />;
  }
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={[s.avatar, box]}>
      <Text style={[s.avatarText, { fontSize: size * 0.38 }]}>{initials || '?'}</Text>
    </View>
  );
};

// ---------- Estados ----------
export const EmptyState: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: { title: string; onPress: () => void };
}> = ({ icon, title, subtitle, action }) => (
  <View style={s.empty}>
    <View style={s.emptyIcon}>
      <Ionicons name={icon} size={30} color={colors.primary} />
    </View>
    <Text style={s.emptyTitle}>{title}</Text>
    {subtitle ? <Text style={s.emptySubtitle}>{subtitle}</Text> : null}
    {action ? <GradientButton title={action.title} onPress={action.onPress} style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} /> : null}
  </View>
);

export const Skeleton: React.FC<{ height?: number; style?: ViewStyle }> = ({ height = 72, style }) => (
  <View style={[{ height, backgroundColor: '#E9EEF6', borderRadius: radius.lg }, style]} />
);

export const Loading: React.FC = () => (
  <View style={{ padding: spacing.xxl, alignItems: 'center' }}>
    <ActivityIndicator color={colors.primary} size="large" />
  </View>
);

// ---------- Estilos ----------
const s = StyleSheet.create({
  btn: {
    borderRadius: radius.lg,
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: font.body },
  btnOutline: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  label: { fontSize: font.small, fontWeight: '600', color: colors.text },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    minHeight: 52,
  },
  input: { flex: 1, paddingHorizontal: spacing.md, fontSize: font.body, color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.card,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: font.subtitle, fontWeight: '700', color: colors.text },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: font.tiny, fontWeight: '700' },
  avatar: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl * 1.5, paddingHorizontal: spacing.xl, gap: 8 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  emptySubtitle: { fontSize: font.small, color: colors.muted, textAlign: 'center' },
});
