import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../src/theme';

const ABAS = [
  { name: 'index', title: 'Início', icon: 'home' },
  { name: 'agenda', title: 'Agenda', icon: 'calendar' },
  { name: 'pacientes', title: 'Pacientes', icon: 'people' },
  { name: 'financeiro', title: 'Financeiro', icon: 'wallet' },
  { name: 'mais', title: 'Mais', icon: 'grid' },
] as const;

export default function PsiTabsLayout() {
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 62 + bottom,
          paddingBottom: 8 + bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {ABAS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? icon : (`${icon}-outline` as const)} size={23} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
