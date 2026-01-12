/**
 * Safe Form Watch Hook
 * 
 * Prevents infinite loops when watching form values in controlled components
 * by using useCallback and proper dependency management to avoid unnecessary re-renders
 */

import { useCallback, useRef, useEffect } from 'react';
import { UseFormReturn, FieldPath, FieldValues } from 'react-hook-form';

/**
 * Safely watch form values without causing infinite re-render loops
 * 
 * @param form - React Hook Form instance
 * @param fieldName - Field name to watch (optional, watches all fields if not provided)
 * @param defaultValue - Default value to return when field is undefined
 * @returns The watched value or defaultValue
 */
export function useSafeFormWatch<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldName?: FieldPath<T>,
  defaultValue?: any
) {
  const lastValueRef = useRef<any>(defaultValue);
  
  // Use useCallback to prevent creating new references on every render
  const getValue = useCallback(() => {
    try {
      if (fieldName) {
        const value = form.getValues(fieldName);
        return value !== undefined ? value : defaultValue;
      } else {
        return form.getValues();
      }
    } catch (error) {
      console.warn('useSafeFormWatch: Error getting form value', error);
      return defaultValue;
    }
  }, [form, fieldName, defaultValue]);

  // Only update when the actual value changes, not on every render
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (fieldName) {
        const newValue = data[fieldName];
        if (newValue !== lastValueRef.current) {
          lastValueRef.current = newValue !== undefined ? newValue : defaultValue;
        }
      } else {
        lastValueRef.current = data;
      }
    });

    return () => subscription.unsubscribe();
  }, [form, fieldName, defaultValue]);

  // Initialize with current value - FIXED: Remove function dependency to prevent infinite loops
  useEffect(() => {
    try {
      if (fieldName) {
        const value = form.getValues(fieldName);
        lastValueRef.current = value !== undefined ? value : defaultValue;
      } else {
        lastValueRef.current = form.getValues();
      }
    } catch (error) {
      console.warn('useSafeFormWatch: Error initializing form value', error);
      lastValueRef.current = defaultValue;
    }
  }, [form, fieldName, defaultValue]); // FIXED: Use actual dependencies instead of function reference

  return lastValueRef.current;
}

/**
 * Safely watch multiple form fields without causing infinite loops
 * 
 * @param form - React Hook Form instance  
 * @param fieldNames - Array of field names to watch
 * @param defaultValues - Object with default values for each field
 * @returns Object with watched values
 */
export function useSafeFormWatchMultiple<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldNames: FieldPath<T>[],
  defaultValues: Partial<Record<FieldPath<T>, any>> = {}
) {
  const lastValuesRef = useRef<Partial<Record<FieldPath<T>, any>>>(defaultValues);

  useEffect(() => {
    const subscription = form.watch((data) => {
      const newValues: Partial<Record<FieldPath<T>, any>> = {};
      let hasChanges = false;

      fieldNames.forEach((fieldName) => {
        const newValue = data[fieldName];
        const defaultValue = defaultValues[fieldName];
        const finalValue = newValue !== undefined ? newValue : defaultValue;
        
        if (finalValue !== lastValuesRef.current[fieldName]) {
          hasChanges = true;
        }
        newValues[fieldName] = finalValue;
      });

      if (hasChanges) {
        lastValuesRef.current = { ...lastValuesRef.current, ...newValues };
      }
    });

    return () => subscription.unsubscribe();
  }, [form, fieldNames, defaultValues]);

  // Initialize with current values
  useEffect(() => {
    const initialValues: Partial<Record<FieldPath<T>, any>> = {};
    fieldNames.forEach((fieldName) => {
      const value = form.getValues(fieldName);
      const defaultValue = defaultValues[fieldName];
      initialValues[fieldName] = value !== undefined ? value : defaultValue;
    });
    lastValuesRef.current = { ...defaultValues, ...initialValues };
  }, [form, fieldNames, defaultValues]);

  return lastValuesRef.current;
}
