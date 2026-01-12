# Radix UI Replacement Guide

## Issue Summary

Radix UI components (Select, RadioGroup, Checkbox, Tooltip) cause infinite loop crashes when used with React Hook Form in React 18 due to conflicts in the `@radix-ui/react-compose-refs` system.

## Root Cause

The issue occurs in `@radix-ui/react-compose-refs` where the ref composition system creates infinite setState loops when integrated with React Hook Form's Controller component. This affects ALL Radix UI components that use refs.

## Solution: Native HTML Components

We've replaced problematic Radix UI components with native HTML equivalents that provide the same functionality without the architectural conflicts.

## Replaced Components

### ✅ NativeSelect (`components/ui/native-select.tsx`)
- **Replaces**: `@radix-ui/react-select`
- **Usage**: Same API as Radix UI Select but with `options` prop
- **Benefits**: No infinite loops, better performance, same visual styling

### ✅ NativeCheckbox (`components/ui/native-checkbox.tsx`)
- **Replaces**: `@radix-ui/react-checkbox`
- **Usage**: Same API as Radix UI Checkbox
- **Benefits**: Direct HTML input, no ref composition issues

### ✅ NativeRadioGroup (`components/ui/native-radio-group.tsx`)
- **Replaces**: `@radix-ui/react-radio-group`
- **Usage**: Takes `options` array instead of children
- **Benefits**: Native radio buttons, no infinite loops

### ⚠️ Tooltip Replacement
- **Temporary Solution**: Using native `title` attributes
- **Future**: Consider implementing custom tooltip with Floating UI

## Updated Files

### Profile System
- ✅ `components/profile/steps/personal-info-step.tsx` - NativeSelect for unit/gender
- ✅ `components/profile/steps/fitness-info-step.tsx` - NativeSelect + NativeCheckbox
- ✅ `components/profile/steps/equipment-preferences-step.tsx` - NativeSelect + NativeCheckbox
- ✅ `components/profile/contextual-help-system.tsx` - Disabled Tooltip
- ✅ `components/profile/unit-preference-manager.tsx` - Native radio buttons
- ✅ `components/profile/enhanced-field-validation.tsx` - Disabled Tooltip

## Development Guidelines

### ❌ AVOID These Radix UI Components
- `@radix-ui/react-select` → Use `NativeSelect`
- `@radix-ui/react-checkbox` → Use `NativeCheckbox`  
- `@radix-ui/react-radio-group` → Use `NativeRadioGroup`
- `@radix-ui/react-tooltip` → Use native `title` or custom solution

### ✅ SAFE Radix UI Components
These components don't use problematic ref composition:
- `@radix-ui/react-slot` (used in Button)
- `@radix-ui/react-label` (used in Form)
- `@radix-ui/react-separator`
- `@radix-ui/react-aspect-ratio`

### ⚠️ CAUTION Required
These may have issues in form contexts:
- `@radix-ui/react-dialog`
- `@radix-ui/react-popover`
- `@radix-ui/react-dropdown-menu`

## Testing Results

After replacing problematic components:
- ✅ Simple profile test passes
- ✅ No more infinite loop errors
- ✅ Form functionality preserved
- ✅ Visual consistency maintained

## Future Considerations

1. **Monitor Radix UI Updates**: Check if future versions resolve ref composition issues
2. **Custom Tooltip Solution**: Implement proper tooltip replacement using Floating UI
3. **Systematic Replacement**: Replace remaining Radix UI components proactively
4. **Performance Benefits**: Native components are lighter and faster

## Migration Pattern

When replacing Radix UI components:

1. **Create Native Alternative**: Build HTML-based component with same API
2. **Match Styling**: Use Tailwind classes to maintain visual consistency  
3. **Preserve Functionality**: Ensure all props and behaviors work identically
4. **Update Imports**: Replace Radix UI imports with native alternatives
5. **Test Thoroughly**: Verify no infinite loops and functionality works

This approach eliminates external dependency complexity while maintaining identical user experience.
