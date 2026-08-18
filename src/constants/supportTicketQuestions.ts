import type { TicketQuestion } from '../services/support.service';

/** Guided support flow — exactly 3 questions. */
export const SUPPORT_TICKET_QUESTIONS: TicketQuestion[] = [
  {
    id: 'issue_type',
    question: 'What is the issue with your order?',
    type: 'choice',
    options: [
      { value: 'delivery', label: 'Delivery' },
      { value: 'missing_item', label: 'Missing item' },
      { value: 'wrong_item', label: 'Wrong item' },
      { value: 'quality_issue', label: 'Quality issue' },
      { value: 'payment', label: 'Payment' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'description',
    question: 'Can you tell us a little more about the issue?',
    type: 'text',
    placeholder: 'Tell us a little more about the issue.',
  },
  {
    id: 'additional_info',
    question: 'Is there anything else that can help us resolve this faster?',
    type: 'text',
    placeholder:
      'Any additional details, preferences, or information we should know.',
  },
];
