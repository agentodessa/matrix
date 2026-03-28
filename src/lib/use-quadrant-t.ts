import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Quadrant } from "@/types/task";

interface QuadrantText {
  title: string;
  priority: string;
  description: string;
}

/**
 * Returns a lookup function for translated quadrant text.
 * All t() calls use static keys visible to the extractor.
 * Values are memoized — recomputed only on language change.
 */
export const useQuadrantT = () => {
  const { t } = useTranslation();

  const map = useMemo<Record<Quadrant, QuadrantText>>(
    () => ({
      1: {
        title: t("Do First"),
        priority: t("Immediate"),
        description: t(
          "High-precision focus on urgent and important objectives. These items require immediate execution to maintain operational velocity.",
        ),
      },
      2: {
        title: t("Schedule"),
        priority: t("High Priority"),
        description: t(
          "Important but not urgent. Plan these tasks strategically to prevent them from becoming emergencies.",
        ),
      },
      3: {
        title: t("Delegate"),
        priority: t("Strategic"),
        description: t(
          "Urgent but not important to you personally. Hand these off to the right people.",
        ),
      },
      4: {
        title: t("Eliminate"),
        priority: t("Low Priority"),
        description: t(
          "Neither urgent nor important. Remove these distractions from your workflow.",
        ),
      },
    }),
    [t],
  );

  return (q: Quadrant) => map[q];
};
