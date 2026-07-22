import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import GlobalHeader from '../../components/GlobalHeader';

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 22, opacity: color === '#00E676' ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabLayout() {
  return (
    <>
      <GlobalHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0A0E17',
            borderTopColor: '#1e293b',
            borderTopWidth: 1,
            height: 72,
            paddingBottom: 12,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#00E676',
          tabBarInactiveTintColor: '#475569',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
          },
        }}>
        <Tabs.Screen
          name="onboard"
          options={{
            title: 'Onboard',
            tabBarIcon: ({ color }) => <TabIcon emoji="📍" color={color} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'My Lands',
            tabBarIcon: ({ color }) => <TabIcon emoji="🌾" color={color} />,
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: 'Wallet',
            tabBarIcon: ({ color }) => <TabIcon emoji="💳" color={color} />,
          }}
        />
        <Tabs.Screen name="admin" options={{ href: null }} />
        <Tabs.Screen name="two" options={{ href: null }} />
        <Tabs.Screen name="landowner" options={{ href: null }} />
      </Tabs>
    </>
  );
}
