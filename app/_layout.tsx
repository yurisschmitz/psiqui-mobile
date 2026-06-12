import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/context/auth';
import { colors } from '../src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

/** Redireciona conforme o estado de autenticação. */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerStyle: { backgroundColor: colors.bg },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="psicologo/[id]" options={{ headerShown: true, headerTitle: 'Psicólogo' }} />
            <Stack.Screen name="pagamento" options={{ headerShown: true, headerTitle: 'Pagamento' }} />
            <Stack.Screen name="sessao/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="documentos" options={{ headerShown: true, headerTitle: 'Documentos' }} />
            <Stack.Screen name="pagamentos" options={{ headerShown: true, headerTitle: 'Pagamentos' }} />
            <Stack.Screen name="diario" options={{ headerShown: true, headerTitle: 'Diário de Bordo' }} />
            <Stack.Screen name="notificacoes" options={{ headerShown: true, headerTitle: 'Notificações' }} />
            <Stack.Screen name="perfil" options={{ headerShown: true, headerTitle: 'Meu Perfil' }} />
          </Stack>
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
