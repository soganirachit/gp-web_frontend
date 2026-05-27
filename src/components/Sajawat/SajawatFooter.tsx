import React from "react";
import { FaFacebook, FaInstagram, FaWhatsapp, FaPhone, FaEnvelope } from "react-icons/fa";
import logoSvg from "../../assets/svg/logo.svg";
import { SOCIAL_URLS } from "../../config/socialUrls";
import { SAJAWAT_CONTACT } from "../../config/sajawatContact";

export const SajawatFooter: React.FC = () => (
  <footer className="bg-white px-5 pb-32 pt-6 sm:px-6">
    <div className="mx-auto flex max-w-lg flex-col items-center text-center">
      <img
        src={logoSvg}
        alt="Genda Phool"
        className="mb-5 h-[4.5rem] w-auto opacity-90 sm:h-20"
      />
      <div className="mb-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <a
          href={`tel:${SAJAWAT_CONTACT.sajawatContactPhone.replace(/\s/g, "")}`}
          className="inline-flex items-center gap-2 text-[13px] text-[#666666]"
        >
          <FaPhone className="h-3.5 w-3.5" aria-hidden />
          {SAJAWAT_CONTACT.sajawatContactPhone}
        </a>
        <a
          href={`mailto:${SAJAWAT_CONTACT.sajawatContactEmail}`}
          className="inline-flex items-center gap-2 text-[13px] text-[#666666]"
        >
          <FaEnvelope className="h-3.5 w-3.5" aria-hidden />
          {SAJAWAT_CONTACT.sajawatContactEmail}
        </a>
      </div>
      <div className="mb-4 flex items-center justify-center gap-5">
        <a
          href={SOCIAL_URLS.facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          className="text-[#1877F2]"
        >
          <FaFacebook className="h-[1.35rem] w-[1.35rem]" />
        </a>
        <a
          href={SOCIAL_URLS.instagramSajawat}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="text-[#E4405F]"
        >
          <FaInstagram className="h-[1.35rem] w-[1.35rem]" />
        </a>
        <a
          href={SOCIAL_URLS.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="text-[#25D366]"
        >
          <FaWhatsapp className="h-[1.35rem] w-[1.35rem]" />
        </a>
      </div>
      <div className="mb-3.5 h-px w-full max-w-md bg-[#E5E7EB]" />
      <p className="text-[11px] text-[#9CA3AF] sm:text-xs">
        © 2025 Sajawat by Genda Phool. All rights reserved.
      </p>
    </div>
  </footer>
);
