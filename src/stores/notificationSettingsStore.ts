import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotificationSettings {
  // Email notifications
  emailIssueAssigned: boolean;
  emailIssueMentioned: boolean;
  emailCommentAdded: boolean;
  emailStatusChanged: boolean;
  emailDueDateReminder: boolean;
  
  // Push notifications
  pushIssueAssigned: boolean;
  pushIssueMentioned: boolean;
  pushCommentAdded: boolean;
  pushStatusChanged: boolean;
  pushDueDateReminder: boolean;
  
  // General
  enableNotifications: boolean;
  enableSounds: boolean;
  enableDesktopNotifications: boolean;
}

interface NotificationSettingsState extends NotificationSettings {
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  resetToDefaults: () => void;
}

const defaultSettings: NotificationSettings = {
  emailIssueAssigned: true,
  emailIssueMentioned: true,
  emailCommentAdded: true,
  emailStatusChanged: false,
  emailDueDateReminder: true,
  
  pushIssueAssigned: true,
  pushIssueMentioned: true,
  pushCommentAdded: true,
  pushStatusChanged: false,
  pushDueDateReminder: true,
  
  enableNotifications: true,
  enableSounds: true,
  enableDesktopNotifications: false,
};

export const useNotificationSettingsStore = create<NotificationSettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: 'notification-settings-storage',
    }
  )
);
