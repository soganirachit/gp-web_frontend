export const SAJAWAT_MEETING_FORM_ID = "sajawat-meeting-form";

export function scrollToSajawatMeetingForm(): void {
  const el = document.getElementById(SAJAWAT_MEETING_FORM_ID);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  const firstInput = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    "input, textarea",
  );
  window.setTimeout(() => firstInput?.focus(), 400);
}
