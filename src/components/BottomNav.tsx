import React from 'react';
import {
  LayoutDashboard,
  Radio,
  MonitorPlay,
  Gamepad2,
  FolderSync,
  Settings,
} from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeTransferCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  setCurrentTab,
  activeTransferCount = 0,
}) => {
  const menuItems = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'discovery', label: 'Devices', icon: Radio },
    { id: 'screen', label: 'Screen', icon: MonitorPlay },
    { id: 'control', label: 'Control', icon: Gamepad2 },
    { id: 'files', label: 'Files', icon: FolderSync, badge: activeTransferCount },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="h-16 bg-white dark:bg-vellichor-surface border-t border-gray-200 dark:border-vellichor-border flex items-center justify-around px-2 shrink-0 z-30 transition-colors">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setCurrentTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors cursor-pointer ${
              isActive
                ? 'text-primary font-semibold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5 mb-0.5" />
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-accent text-[9px] font-bold text-white flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] leading-tight">{item.label}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
