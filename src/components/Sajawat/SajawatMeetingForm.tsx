import React, { useState } from "react";
import { openSajawatWhatsApp } from "../../config/sajawatContact";

type FormState = {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  message: string;
};

const initialForm: FormState = {
  name: "",
  email: "",
  phone: "",
  eventDate: "",
  message: "",
};

export const SajawatMeetingForm: React.FC = () => {
  const [form, setForm] = useState<FormState>(initialForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = [
      "Hi Sajawat by Genda Phool, I'd like to schedule a meeting.",
      form.name && `Name: ${form.name}`,
      form.email && `Email: ${form.email}`,
      form.phone && `Phone: ${form.phone}`,
      form.eventDate && `Event date: ${form.eventDate}`,
      form.message && `Message: ${form.message}`,
    ].filter(Boolean);
    openSajawatWhatsApp(lines.join("\n"));
  };

  return (
    <section className="px-4 pb-8 sm:px-5">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-center font-serif text-xl font-bold text-[#1F2937] sm:text-2xl">
          Let&apos;s Schedule a Meeting!
        </h2>
        <p className="mt-2 text-center text-xs text-[#6B7280] sm:text-sm">
          Get in touch with our experts to make that dream wedding happen!
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#111827]">
              Name *
            </label>
            <input
              type="text"
              required
              placeholder="Your full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#9B2226] focus:outline-none focus:ring-1 focus:ring-[#9B2226]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#111827]">
              Email *
            </label>
            <input
              type="email"
              required
              placeholder="your.email@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#9B2226] focus:outline-none focus:ring-1 focus:ring-[#9B2226]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#111827]">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              placeholder="+91 XXXXX XXXXX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#9B2226] focus:outline-none focus:ring-1 focus:ring-[#9B2226]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#111827]">
              Date of Event
            </label>
            <input
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2.5 text-sm text-[#111827] focus:border-[#9B2226] focus:outline-none focus:ring-1 focus:ring-[#9B2226]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#111827]">
              Message (Optional)
            </label>
            <textarea
              rows={4}
              placeholder="Tell us about your wedding vision..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full resize-none rounded-lg border border-[#D1D5DB] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#9B2226] focus:outline-none focus:ring-1 focus:ring-[#9B2226]"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-[#9B2226] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#7A1B1E]"
          >
            Schedule Meeting via WhatsApp
          </button>
          <p className="text-center text-[11px] text-[#9CA3AF] sm:text-xs">
            Free consultation • Response within 24 hours
          </p>
        </form>
      </div>
    </section>
  );
};
