/**
 * Constants for Window Manager
 * Window Manager 常量
 */

export const IPC_CHANNELS = {
  RENDERER_TO_MAIN: 'renderer-to-main',
  RENDERER_TO_MAIN_SYNC: 'renderer-to-main-sync',
  MESSAGE_BUS_PORT: 'message-bus-port',
};

export const EVENTS = {
  WINDOW_STATE_CHANGED: 'window-state-changed',
  ERROR: 'error',
};

export const DEFAULTS = {
  MAX_WINDOWS: 50,
  CLEANUP_INTERVAL: 30000,
};
