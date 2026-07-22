import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

export default function CompanyTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0E17',
          borderTopColor: '#1e293b',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#00E676',
        tabBarInactiveTintColor: '#475569',
      }}>
      <Tabs.Screen
        name="exchange"
        options={{
          title: 'Exchange',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>💼</Text>,
        }}
      />
    </Tabs>
  );
}
