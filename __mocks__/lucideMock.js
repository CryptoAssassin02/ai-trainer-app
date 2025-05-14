import React from 'react';

// Basic mock component for any Lucide icon
const MockIcon = (props) => React.createElement('span', { ...props, 'data-testid': 'mock-lucide-icon' });

// Export named icons as the same mock component
export const Calendar = MockIcon;
export const ChevronDown = MockIcon;
export const Check = MockIcon;
export const ChevronLeft = MockIcon;
export const ChevronRight = MockIcon;
export const CheckCircledIcon = MockIcon;
export const CrossCircledIcon = MockIcon;
export const ReloadIcon = MockIcon;
// Add any other frequently used icons here if necessary

// Export a default mock as well, required by some imports
export default MockIcon; 