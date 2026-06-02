import React from "react";
import { useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import sajawatLogoSvg from "../../assets/svg/sajawat_logo.svg";
import sajawatScallopSvg from "../../assets/svg/sajawat_red_scallop.svg";
import { SAJAWAT_PAGE_SHELL_CLASS } from "../../constants/sajawatLayout";
import { scrollToSajawatMeetingForm } from "../../utils/sajawatMeetingForm";

export const SajawatBottomBar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Sajawat navigation"
    >
      <div
        className={`relative min-h-[3.125rem] w-full border-t border-[#F0D4CC] bg-[#FFF5F0] pt-1 ${SAJAWAT_PAGE_SHELL_CLASS}`}
      >
        <div className="flex items-center pl-3">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="relative flex h-12 w-12 shrink-0 flex-col items-center justify-center"
            aria-label="Home"
          >
            <img
              src={sajawatScallopSvg}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full"
            />
            <FaHome className="relative mb-0.5 h-4 w-4 text-white" />
            <span className="relative text-[8px] font-medium text-white">
              Home
            </span>
          </button>
          <div
            className="ml-2 h-7 w-px shrink-0 bg-[#9B2226]/35"
            aria-hidden
          />
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-28">
          <img
            src={sajawatLogoSvg}
            alt="Sajawat by Genda Phool"
            className="h-7 w-auto max-w-[6.75rem] sm:h-8"
          />
        </div>

        <button
          type="button"
          onClick={scrollToSajawatMeetingForm}
          className="absolute right-0 top-2.5 rounded-l-xl bg-gradient-to-r from-[#FACB1E] to-[#F5A623] px-3 py-2 text-[9px] font-bold leading-tight tracking-wide text-[#9B2226] sm:text-[10px]"
        >
          CONSULT FOR FREE!
        </button>
      </div>
    </div>
  );
};
