import React from 'react';
import {
  LayoutDashboard,
  Radio,
  MonitorPlay,
  Gamepad2,
  FolderSync,
  Settings,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeTransferCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  activeTransferCount = 0,
}) => {
  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'discovery', label: 'Discovery', icon: Radio },
    { id: 'screen', label: 'Screen Share', icon: MonitorPlay },
    { id: 'control', label: 'Remote Control', icon: Gamepad2 },
    { id: 'files', label: 'File Transfer', icon: FolderSync, badge: activeTransferCount },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 bg-white dark:bg-vellichor-surface border-r border-gray-200 dark:border-vellichor-border flex flex-col justify-between shrink-0 p-4 transition-colors">
      <nav className="space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-glow'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-vellichor-card hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && item.badge > 0 ? (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white text-primary' : 'bg-primary text-white'
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="p-3 rounded-2xl bg-gray-50 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border space-y-2">
        <div className="flex items-center space-x-2 text-xs text-secondary font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>E2E Encrypted LAN</span>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
          Direct peer-to-peer communication powered by WebRTC & Tauri.
        </p>
      </div>
    </aside>
  );
};
