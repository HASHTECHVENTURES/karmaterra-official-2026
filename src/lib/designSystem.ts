// Centralized Design System
// All colors, spacing, and design tokens should be referenced from here

export const designSystem = {
  colors: {
    primary: {
      main: 'bg-karma-gold text-white',
      hover: 'hover:bg-karma-gold/90',
      light: 'bg-karma-light-gold text-karma-brown',
    },
    secondary: {
      main: 'bg-karma-green text-white',
      hover: 'hover:bg-karma-green/90',
      light: 'bg-green-50 text-karma-green',
    },
    accent: {
      orange: 'bg-orange-500',
      purple: 'bg-purple-500',
      cyan: 'bg-cyan-500',
      blue: 'bg-blue-500',
      emerald: 'bg-emerald-500',
      red: 'bg-red-500',
    },
    background: {
      page: 'bg-white',
      card: 'bg-white',
      section: 'bg-gray-50',
    },
    text: {
      primary: 'text-gray-800',
      secondary: 'text-gray-600',
      muted: 'text-gray-500',
    },
  },
  spacing: {
    page: 'px-4 py-6',
    section: 'mb-8',
    card: 'p-6',
    button: 'px-4 py-3',
  },
  borderRadius: {
    small: 'rounded-lg',
    medium: 'rounded-xl',
    large: 'rounded-2xl',
  },
  shadows: {
    small: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-lg',
  },
  transitions: {
    default: 'transition-all duration-200',
    smooth: 'transition-all duration-300',
  },
} as const;

// Menu item colors (consistent across app)
export const menuItemColors = {
  home: 'bg-gradient-to-br from-orange-400 to-orange-600',
  shop: 'bg-gradient-to-br from-indigo-500 to-indigo-700',
  profile: 'bg-gradient-to-br from-cyan-500 to-cyan-700',
  feedback: 'bg-gradient-to-br from-blue-500 to-blue-700',
  help: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
  signOut: 'bg-gradient-to-br from-red-500 to-red-700',
} as const;


