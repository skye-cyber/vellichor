import React, { useState } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface SelectOption {
    label: string;
    value: string;
    description?: string;
}

interface SelectSettingProps {
    icon?: React.ComponentType<{ className?: string }>;
    label: string;
    description?: string;
    value: string;
    options: SelectOption[];
    onValueChange: (val: string) => void;
}

export const SelectSetting: React.FC<SelectSettingProps> = ({
    icon: Icon,
    label,
    description,
    value,
    options,
    onValueChange,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selected = options.find((o) => o.value === value);

    return (
        <>
            <div
                onClick={() => setIsOpen(true)}
                className="p-4 rounded-2xl flex items-center justify-between transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"
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
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <span>{selected?.label || value}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </div>
            </div>

            {/* Modal Dialog for Options */}
            {isOpen && (
                <div onClick={() => setIsOpen((prev) => !prev)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-sm bg-white dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-base text-gray-900 dark:text-white">
                                {label}
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            {options.map((opt) => {
                                const isItemActive = opt.value === value;
                                return (
                                    <div
                                        key={opt.value}
                                        onClick={() => {
                                            onValueChange(opt.value);
                                            setIsOpen(false);
                                        }}
                                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${isItemActive
                                            ? 'bg-primary/10 border-primary text-primary font-semibold'
                                            : 'border-transparent hover:bg-gray-50 dark:hover:bg-vellichor-card text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        <div>
                                            <div className="text-sm">{opt.label}</div>
                                            {opt.description && (
                                                <div className="text-xs text-gray-400 font-normal mt-0.5">
                                                    {opt.description}
                                                </div>
                                            )}
                                        </div>
                                        {isItemActive && <Check className="w-4 h-4 text-primary" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
