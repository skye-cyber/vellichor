import React from 'react';
import { RotateCcw } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  showReset?: boolean;
  onReset?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon: Icon,
  showReset,
  onReset,
}) => {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center space-x-2">
        {Icon && <Icon className="w-4 h-4 text-primary" />}
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {title}
        </h3>
      </div>
      {showReset && onReset && (
        <button
          onClick={onReset}
          className="flex items-center space-x-1 text-xs text-gray-400 hover:text-primary transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
};
