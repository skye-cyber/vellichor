import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';

interface ToggleSettingProps {
  icon: string;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => Promise<void> | void;
  disabled?: boolean;
  warning?: string;
}

export const ToggleSetting: React.FC<ToggleSettingProps> = ({
  icon,
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  warning,
}) => {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    try {
      setLoading(true);
      await onValueChange(!value);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <View style={styles.iconContainer}>
        <Icon name={icon} size={24} color={theme.colors.primary} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
        {warning && value && (
          <View style={styles.warningContainer}>
            <Icon name="alert" size={14} color={theme.colors.warning} />
            <Text style={styles.warningText}>{warning}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Switch
          value={value}
          onValueChange={handleToggle}
          disabled={disabled}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary + '80',
          }}
          thumbColor={value ? theme.colors.primary : '#f4f3f4'}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: theme.colors.warning + '10',
    padding: 6,
    borderRadius: 6,
  },
  warningText: {
    fontSize: 12,
    color: theme.colors.warning,
    marginLeft: 4,
  },
});
