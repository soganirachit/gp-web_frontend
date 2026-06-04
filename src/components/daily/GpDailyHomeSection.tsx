import type { ReactNode } from "react";
import {
  gpDailyHome,
  gpDailyTitleCase,
} from "../../utils/gpDailyHomeDesignSystem";

type Props = {
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
  /** Legacy — spacing comes from parent `homeSectionStackGap` (gap-4). */
  isFirstInGroup?: boolean;
};

/**
 * Shared GP Daily home section — identical heading + 16px heading→content gap.
 */
export function GpDailyHomeSection({
  title,
  headerRight,
  children,
}: Props) {
  return (
    <section>
      <div
        className={`flex items-center justify-between gap-2 min-w-0 ${gpDailyHome.headingToContent}`}
      >
        <h2
          className={`min-w-0 flex-1 shrink pr-2 ${gpDailyHome.sectionHeading}`}
        >
          {gpDailyTitleCase(title)}
        </h2>
        {headerRight}
      </div>
      {children}
    </section>
  );
}
