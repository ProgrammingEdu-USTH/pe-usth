'use client';

import React from 'react';
import styles from './lofi-ui.module.css';

export interface LofiTabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

export interface LofiTabsProps<T extends string = string> {
  tabs: LofiTabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
}

export function LofiTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = '',
}: LofiTabsProps<T>) {
  return (
    <div className={`${styles.segmentedTabs} ${className}`.trim()} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${styles.segmentedTabBtn} ${isActive ? styles.segmentedTabActive : ''}`.trim()}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default LofiTabs;
