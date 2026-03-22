import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';

interface SectionHeaderProps {
  title: string;
  icon?: string;
  onReset?: () => void;
  showReset?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon,
  onReset,
  showReset = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        {icon && (
          <Icon
            name={icon}
            size={20}
            color={theme.colors.primary}
            style={styles.icon}
          />
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      {showReset && onReset && (
        <TouchableOpacity onPress={onReset} style={styles.resetButton}>
          <Icon name="restore" size={18} color={theme.colors.text.secondary} />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  resetText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginLeft: 4,
  },
});
