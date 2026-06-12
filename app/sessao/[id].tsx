import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { getToken } from '../../src/api/client';
import { colors, font, spacing } from '../../src/theme';

/**
 * Sessão de vídeo (v1): abre a sala da plataforma web dentro do app,
 * injetando o token de autenticação no localStorage antes do carregamento.
 * A página web cuida do Twilio (câmera, microfone, conexão).
 */
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://10.0.2.2:5173';

export default function VideoSessionScreen() {
  const router = useRouter();
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>();
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken().then((t) => {
      setTokenState(t);
      setLoading(false);
    });
  }, []);

  const patientName = encodeURIComponent(nome ?? 'Paciente');
  const url = `${WEB_URL}/video-session-patient/${id}/${patientName}`;

  // Injeta o token Sanctum no localStorage da SPA antes do carregamento
  const injectAuth = token
    ? `window.localStorage.setItem('auth_token', ${JSON.stringify(token)}); true;`
    : 'true;';

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.closeBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <Text style={s.title} numberOfLines={1}>
          Sessão com {nome ?? 'seu psicólogo'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#60A5FA" />
        </View>
      ) : (
        <WebView
          source={{ uri: url }}
          style={{ flex: 1, backgroundColor: '#0F172A' }}
          injectedJavaScriptBeforeContentLoaded={injectAuth}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          startInLoadingState
          renderLoading={() => (
            <View style={[s.center, StyleSheet.absoluteFill, { backgroundColor: '#0F172A' }]}>
              <ActivityIndicator size="large" color="#60A5FA" />
              <Text style={s.loadingText}>Conectando à sessão...</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#0F172A',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontWeight: '700', fontSize: font.body, flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: 'rgba(255,255,255,0.7)', fontSize: font.small },
});
