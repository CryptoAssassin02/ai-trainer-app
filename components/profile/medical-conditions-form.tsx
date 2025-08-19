/**
 * Medical Conditions Form Component
 * Demonstrates advanced Zod validation with healthcare data patterns
 */

'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X, AlertTriangle, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import { 
  medicalConditionsFormSchema, 
  type MedicalConditionsFormData,
  VALIDATION_CONSTANTS,
  validateMedicalCondition
} from '@/lib/validation/profile-schemas';

interface MedicalConditionsFormProps {
  initialData?: MedicalConditionsFormData;
  onSubmit: (data: MedicalConditionsFormData) => Promise<void>;
  onCancel?: () => void;
}

export function MedicalConditionsForm({ 
  initialData, 
  onSubmit, 
  onCancel 
}: MedicalConditionsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MedicalConditionsFormData>({
    resolver: zodResolver(medicalConditionsFormSchema),
    mode: 'onChange',
    defaultValues: {
      medicalConditions: initialData?.medicalConditions || [],
      hasConditions: initialData?.hasConditions || false,
      conditionsAffectWorkout: initialData?.conditionsAffectWorkout || false,
      doctorClearance: initialData?.doctorClearance || false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'medicalConditions',
  });

  const watchedConditions = form.watch('medicalConditions');
  const hasConditions = form.watch('hasConditions');

  const handleSubmit = async (data: MedicalConditionsFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCondition = () => {
    if (fields.length < VALIDATION_CONSTANTS.MEDICAL_CONDITIONS_MAX) {
      append({ condition: '' });
    }
  };

  const removeCondition = (index: number) => {
    remove(index);
    if (fields.length === 1) {
      form.setValue('hasConditions', false);
    }
  };

  const validateConditionInput = (value: string): boolean => {
    return validateMedicalCondition(value);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Medical Conditions & Health Information
        </CardTitle>
        <CardDescription>
          Please provide information about any medical conditions that might affect your workout routine.
          This information will be kept strictly confidential and helps us create safer exercise recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            
            {/* Has Conditions Checkbox */}
            <FormField
              control={form.control}
              name="hasConditions"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) {
                          form.setValue('medicalConditions', []);
                          form.setValue('conditionsAffectWorkout', false);
                          form.setValue('doctorClearance', false);
                        }
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      I have medical conditions or health concerns that may affect my exercise routine
                    </FormLabel>
                    <FormDescription>
                      Check this if you have any conditions, injuries, or limitations
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Medical Conditions List */}
            {hasConditions && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel>Medical Conditions</FormLabel>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {fields.length}/{VALIDATION_CONSTANTS.MEDICAL_CONDITIONS_MAX}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCondition}
                      disabled={fields.length >= VALIDATION_CONSTANTS.MEDICAL_CONDITIONS_MAX}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Condition
                    </Button>
                  </div>
                </div>

                {/* Conditions Input Fields */}
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={`medicalConditions.${index}.condition`}
                      render={({ field: fieldProps }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input
                                {...fieldProps}
                                placeholder={`Condition ${index + 1} (max ${VALIDATION_CONSTANTS.MEDICAL_CONDITION_MAX_LENGTH} characters)`}
                                maxLength={VALIDATION_CONSTANTS.MEDICAL_CONDITION_MAX_LENGTH}
                                className={`flex-1 ${
                                  fieldProps.value && !validateConditionInput(fieldProps.value)
                                    ? 'border-red-500'
                                    : ''
                                }`}
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCondition(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center">
                            <FormMessage />
                            <span className="text-xs text-muted-foreground">
                              {fieldProps.value?.length || 0}/{VALIDATION_CONSTANTS.MEDICAL_CONDITION_MAX_LENGTH}
                            </span>
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                {/* Additional Health Questions */}
                <div className="space-y-4 border-t pt-4">
                  <FormField
                    control={form.control}
                    name="conditionsAffectWorkout"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            These conditions may limit my ability to perform certain exercises
                          </FormLabel>
                          <FormDescription>
                            This helps us avoid recommending exercises that might be harmful
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="doctorClearance"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I have obtained medical clearance to exercise
                          </FormLabel>
                          <FormDescription>
                            Recommended for anyone with serious medical conditions
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Validation Summary */}
            {Object.keys(form.formState.errors).length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Please fix the following issues:</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 mt-2 space-y-1">
                    {Object.entries(form.formState.errors).map(([field, error]) => (
                      <li key={field} className="text-sm">
                        {field === 'medicalConditions' && Array.isArray(error) 
                          ? error.map((err, index) => (
                              <div key={index}>
                                <strong>Condition {index + 1}:</strong> {err?.message}
                              </div>
                            ))
                          : <><strong>{field}:</strong> {error?.message}</>
                        }
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Important Notice */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Medical Disclaimer</AlertTitle>
              <AlertDescription>
                This app does not provide medical advice. Always consult with a healthcare professional 
                before beginning any exercise program, especially if you have medical conditions.
              </AlertDescription>
            </Alert>

            {/* Form Actions */}
            <div className="flex justify-end gap-3">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting || !form.formState.isValid}
                className="bg-[#3E9EFF] hover:bg-[#3E9EFF]/90"
              >
                {isSubmitting ? 'Saving...' : 'Save Medical Information'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Example usage component for demonstration
export function MedicalConditionsExample() {
  const handleSubmit = async (data: MedicalConditionsFormData) => {
    console.log('Medical conditions data:', data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <div className="p-6">
      <MedicalConditionsForm
        onSubmit={handleSubmit}
        initialData={{
          medicalConditions: [],
          hasConditions: false,
          conditionsAffectWorkout: false,
          doctorClearance: false,
        }}
      />
    </div>
  );
}
