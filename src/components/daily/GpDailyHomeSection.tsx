import type { ReactNode } from "react";
import {
  gpDailyHome,
  gpDailyTitleCase,
} from "../../utils/gpDailyHomeDesignSystem";

type Props = {
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
  /** Legacy — spacing comes from parent `homeSectionStackGap`. */
  isFirstInGroup?: boolean;
  /** Open Sans section title (All Packs, Puja Packs, …). */
  titleSans?: boolean;
};

/**
 * Shared GP Daily home section — identical heading + 16px heading→content gap.
 */
export function GpDailyHomeSection({
  title,
  headerRight,
  children,
  titleSans = true,
}: Props) {
  return (
    <section>
      <div
        className={`flex items-center justify-between gap-2 min-w-0 ${gpDailyHome.headingToContent}`}
      >
        <h2
          className={`min-w-0 flex-1 shrink pr-2 ${
            titleSans ? gpDailyHome.sectionHeadingSans : gpDailyHome.sectionHeading
          }`}
        >
          {gpDailyTitleCase(title)}
        </h2>
        {headerRight}
      </div>
      {children}
    </section>
  );
}
