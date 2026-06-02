import React, { useState } from "react";
import { toast } from "react-hot-toast";
import {
  sajawatLeadSubmitErrorMessage,
  submitSajawatLead,
} from "../../services/sajawat.service";
import { SAJAWAT_MEETING_FORM_ID } from "../../utils/sajawatMeetingForm";

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
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const result = await submitSajawatLead({
        name: form.name,
        email: form.email,
        phone: form.phone,
        event_date: form.eventDate,
        message: form.message,
      });
      setSubmitted(true);
      setForm(initialForm);
      toast.success(result.message);
      if (result.sheetWarning) {
        toast(
          "Your request was received. Spreadsheet sync had an issue — our team still has your details.",
          { icon: "⚠️" },
        );
      }
    } catch (error) {
      toast.error(sajawatLeadSubmitErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id={SAJAWAT_MEETING_FORM_ID} className="px-4 pb-8 scroll-mt-24 sm:px-5">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-center font-serif text-xl font-bold text-[#1F2937] sm:text-2xl">
          Let&apos;s Schedule a Meeting!
        </h2>
        <p className="mt-2 text-center text-xs text-[#6B7280] sm:text-sm">
          Share your details below — we&apos;ll record your request and our team will reach out shortly.
        </p>

        {submitted ? (
          <div className="mt-6 rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] px-4 py-5 text-center">
            <p className="text-sm font-semibold text-[#166534]">
              Thank you! Your details have been submitted.
            </p>
            <p className="mt-1 text-xs text-[#15803D]">
              Your request has been saved. Our team will reach out within 24 hours.
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-4 text-sm font-medium text-[#9B2226] underline underline-offset-2"
            >
              Submit another request
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
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
                disabled={submitting}
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#9B2226] focus:outline-none focus:ring-1 focus:ring-[#9B2226] disabled:opacity-60"
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
                disabled={submitting}
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#9B2226] focus:outline-none focus:ring-1 focus:ring-[#9B2226] disabled:opacity-60"
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
                disabled={submitting}
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#9B2226] focus:outline-none focus:ring-1 focus:ring-[#9B2226] disabled:opacity-60"
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
                disabled={submitting}
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2.5 text-sm text-[#111827] focus:border-[#9B2226] focus:outline-none focus:ring-1 focus:ring-[#9B2226] disabled:opacity-60"
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
                disabled={submitting}
                className="w-full resize-none rounded-lg border border-[#D1D5DB] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#9B2226] focus:outline-none focus:ring-1 focus:ring-[#9B2226] disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#9B2226] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#7A1B1E] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Submitting…" : "Schedule Meeting"}
            </button>
            <p className="text-center text-[11px] text-[#9CA3AF] sm:text-xs">
              Free consultation • Response within 24 hours
            </p>
          </form>
        )}
      </div>
    </section>
  );
};
