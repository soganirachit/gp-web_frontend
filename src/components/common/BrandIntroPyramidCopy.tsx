import React from "react";
import {
  GP_BRAND_PYRAMID_CLASS,
  GP_BRAND_PYRAMID_LEAD_CLASS,
} from "../../utils/homepageTypography";

type Props = {
  className?: string;
};

/** Pyramid on phone/tablet; single line on laptop+ — GP Daily & Store only (not landing). */
export function BrandIntroPyramidCopy({ className = "" }: Props) {
  return (
    <>
      <p
        className={[GP_BRAND_PYRAMID_CLASS, "lg:hidden", className]
          .filter(Boolean)
          .join(" ")}
      >
        <span className={GP_BRAND_PYRAMID_LEAD_CLASS}>We are Genda Phool!</span>
        <span className="mt-0.5 block">Your partner for</span>
        <span className="block">everyday floral needs</span>
      </p>
      <p
        className={[GP_BRAND_PYRAMID_CLASS, "hidden lg:block", className]
          .filter(Boolean)
          .join(" ")}
      >
        <span className={GP_BRAND_PYRAMID_LEAD_CLASS}>We are Genda Phool!</span>{" "}
        Your partner for everyday floral needs
      </p>
    </>
  );
}
