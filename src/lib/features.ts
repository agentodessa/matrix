import { Plan } from "../types/user";

const PRO_FEATURES = {
  calendarFullView: true,
  cloudSync: true,
  unlimitedProjects: true,
} as const;

export type Feature = keyof typeof PRO_FEATURES;

export const FREE_PROJECT_LIMIT = 2;

export function isFeatureAvailable(feature: Feature, plan: Plan): boolean {
  if (!PRO_FEATURES[feature]) return true;
  return plan === "pro";
}

export function canCreateProject(projectCount: number, plan: Plan): boolean {
  if (plan === "pro") return true;
  return projectCount < FREE_PROJECT_LIMIT;
}
