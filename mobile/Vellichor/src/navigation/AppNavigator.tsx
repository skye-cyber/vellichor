import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TransitionPresets } from '@react-navigation/stack';
import HomeScreen from '../screens/Home';
import DiscoveryScreen from '../screens/Discovery';
import ControlScreen from '../screens/Control';
import FilesScreen from '../screens/Files';
import SettingsScreen from '../screens/Settings';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...TransitionPresets.SlideFromRightIOS,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Discovery" component={DiscoveryScreen} />
      <Stack.Screen name="Control" component={ControlScreen} />
      <Stack.Screen name="Files" component={FilesScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
