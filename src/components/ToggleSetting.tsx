import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ToggleSettingProps {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
  warning?: string;
}

export const ToggleSetting: React.FC<ToggleSettingProps> = ({
  icon: Icon,
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  warning,
}) => {
  return (
    <div
      onClick={() => !disabled && onValueChange(!value)}
      className={`p-4 rounded-2xl flex items-center justify-between transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <div className="flex items-start space-x-3.5 pr-4">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            {label}
          </h4>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
          {warning && value && (
            <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-amber-500">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{warning}</span>
            </div>
          )}
        </div>
      </div>

      {/* Switch Pill */}
      <div
        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
          value ? 'bg-primary' : 'bg-gray-300 dark:bg-vellichor-border'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform absolute top-0.5 ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </div>
  );
};
