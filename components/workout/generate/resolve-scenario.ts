import type { EnhancedWorkoutPlan, WeekStructure } from '@/lib/api/types';

export type GenerationScenario = 'none' | 'structureOnly' | 'twoParts' | 'allComplete';

export interface ScenarioResult {
  scenario: GenerationScenario;
  planId?: string;
}

function hasProgramStructure(plan: any): boolean {
  return Boolean(plan?.plan_data?.structure || plan?.planData?.structure || plan?.mesocycleStructure);
}

function hasWeeklyStructure(plan: any): boolean {
  const m0 = plan?.plan_data?.mesocycles?.[0] || plan?.planData?.mesocycles?.[0];
  return Array.isArray(m0?.weekly_structures) && m0.weekly_structures.length > 0;
}

function hasDailyWorkouts(plan: EnhancedWorkoutPlan): boolean {
  const fromStructured = plan?.mesocycleStructure?.[0]?.weeks as WeekStructure[] | undefined;
  if (fromStructured && fromStructured.length) return true;
  const fromPlanData = (plan as any)?.planData?.mesocycles?.[0]?.weeks as WeekStructure[] | undefined;
  if (fromPlanData && fromPlanData.length) return true;
  return false;
}

export function resolveScenarioFromPlans(plans: Array<EnhancedWorkoutPlan | any> | undefined | null): ScenarioResult {
  if (!plans || plans.length === 0) return { scenario: 'none' };
  // Prefer the most recently updated plan with any structure present
  const candidate = (plans as any[]).find(p => hasProgramStructure(p));
  if (!candidate) return { scenario: 'none' };

  const planId = candidate.id as string | undefined;
  const weekly = hasWeeklyStructure(candidate);
  const daily = hasDailyWorkouts(candidate as EnhancedWorkoutPlan);

  if (weekly && daily) return { scenario: 'allComplete', planId };
  if (weekly && !daily) return { scenario: 'twoParts', planId };
  if (!weekly && hasProgramStructure(candidate)) return { scenario: 'structureOnly', planId };
  return { scenario: 'none' };
}


