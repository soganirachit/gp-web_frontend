import React from "react";
import { FaWhatsapp, FaPhone, FaFileDownload } from "react-icons/fa";
import {
  openSajawatWhatsApp,
  SAJAWAT_CONTACT,
} from "../../config/sajawatContact";

export const SajawatWeddingJourneyCta: React.FC = () => {
  const brochureUrl = SAJAWAT_CONTACT.sajawatBrochureUrl.trim();

  return (
    <section className="px-4 pb-8 sm:px-5">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-center font-serif text-xl font-bold text-[#1F2937] sm:text-2xl">
          Start Your Wedding Journey
        </h2>
        <p className="mt-2 text-center text-xs text-[#6B7280] sm:text-sm">
          Let&apos;s create something beautiful together
        </p>
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() =>
              openSajawatWhatsApp(
                "Hi Sajawat by Genda Phool, I'd like to chat about my wedding floral decor.",
              )
            }
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#9B2226] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#7A1B1E]"
          >
            <FaWhatsapp className="h-5 w-5" aria-hidden />
            Chat on WhatsApp
          </button>
          <a
            href={`tel:${SAJAWAT_CONTACT.sajawatContactPhone.replace(/\s/g, "")}`}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#D1D5DB] bg-white py-3.5 text-sm font-semibold text-[#1F2937] transition-colors hover:bg-[#F9FAFB]"
          >
            <FaPhone className="h-4 w-4" aria-hidden />
            Call Us Now
          </a>
          {brochureUrl ? (
            <a
              href={brochureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-[#D1D5DB] bg-white py-3.5 text-sm font-semibold text-[#1F2937] transition-colors hover:bg-[#F9FAFB]"
            >
              <FaFileDownload className="h-4 w-4" aria-hidden />
              Download Brochure
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] py-3.5 text-sm font-semibold text-[#9CA3AF]"
            >
              <FaFileDownload className="h-4 w-4" aria-hidden />
              Download Brochure
            </button>
          )}
        </div>
        <p className="mt-4 text-center text-[11px] text-[#9CA3AF] sm:text-xs">
          Free consultation available • Response within 24 hours
        </p>
      </div>
    </section>
  );
};
