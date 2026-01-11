// React Native app entry point for MoveAround TMS
// This is a placeholder for the native mobile app (drivers & customers)
// Features: offline mode, push notifications, document scanning

import React from 'react';
import { View, Text, Button } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>MoveAround TMS Mobile</Text>
      <Text style={{ marginTop: 16 }}>Offline mode, push notifications, and document scanning coming soon.</Text>
      <Button title="Scan Document" onPress={() => {}} />
    </View>
  );
}
