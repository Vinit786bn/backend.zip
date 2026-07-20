import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: '#0A0E17',
            borderTopWidth: 0,
          },
          default: {
            backgroundColor: '#0A0E17',
            borderTopWidth: 0,
          },
        }),
        tabBarActiveTintColor: '#00E676',
        tabBarInactiveTintColor: '#475569',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Industry',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.line.uptrend.xyaxis" color={color} />,
        }}
      />
      <Tabs.Screen
        name="landowner"
        options={{
          title: 'Landowner',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="leaf.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Verifier',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="shield.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
