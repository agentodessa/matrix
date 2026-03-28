import { Plan } from "@/types/user";

const PRO_FEATURES = {
  calendarFullView: true,
  cloudSync: true,
  unlimitedProjects: true,
} as const;

const PRO_TEAM_FEATURES = {
  ...PRO_FEATURES,
  teamWorkspace: true,
} as const;

export type Feature = keyof typeof PRO_TEAM_FEATURES;

export const FREE_PROJECT_LIMIT = 2;

export const isFeatureAvailable = (feature: Feature, plan: Plan): boolean => {
  if (plan === "pro_team") return feature in PRO_TEAM_FEATURES;
  if (plan === "pro") return feature in PRO_FEATURES;
  return !(feature in PRO_TEAM_FEATURES);
};

export const canCreateProject = (projectCount: number, plan: Plan): boolean => {
  if (plan === "pro" || plan === "pro_team") return true;
  return projectCount < FREE_PROJECT_LIMIT;
};
