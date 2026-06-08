import React from "react";
import { GP_HOMEPAGE_SECTION_HEADING_CLASS } from "../../utils/homepageTypography";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function HomepageSectionHeading({ children, className = "" }: Props) {
  return (
    <h2
      className={[GP_HOMEPAGE_SECTION_HEADING_CLASS, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </h2>
  );
}
