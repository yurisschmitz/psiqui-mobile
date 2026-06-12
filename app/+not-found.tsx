import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { colors, spacing } from '../src/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Ops!' }} />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.md,
          backgroundColor: colors.bg,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Tela não encontrada.</Text>
        <Link href="/(tabs)" style={{ color: colors.primary, fontWeight: '600' }}>
          Voltar para o início
        </Link>
      </View>
    </>
  );
}
