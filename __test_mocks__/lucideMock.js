const React = require('react');

// Basic mock component for any Lucide icon
const MockIcon = (props) => React.createElement('span', { ...props, 'data-testid': 'mock-lucide-icon' });

// Export named icons as the same mock component
module.exports = {
  Calendar: MockIcon,
  ChevronDown: MockIcon,
  Check: MockIcon,
  ChevronLeft: MockIcon,
  ChevronRight: MockIcon,
  CheckCircledIcon: MockIcon,
  CrossCircledIcon: MockIcon,
  ReloadIcon: MockIcon,
  AlertTriangle: MockIcon,
  RefreshCw: MockIcon,
  Home: MockIcon,
  Bug: MockIcon,
  Info: MockIcon,
  Wifi: MockIcon,
  WifiOff: MockIcon,
  Clock: MockIcon,
  ExternalLink: MockIcon,
  Shield: MockIcon,
  Server: MockIcon,
  Settings: MockIcon,
  HelpCircle: MockIcon,
  Loader2: MockIcon,
  // Add any other frequently used icons here if necessary
  __esModule: true,
  default: MockIcon
}; 