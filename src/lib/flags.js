// Reasons a student can flag a section with.
const REASONS = {
  confused: "I'm confused",
  question: 'I have a question',
  wrong: 'Something looks wrong',
}

export const REASON_OPTIONS = Object.entries(REASONS)
export const flagReasonLabel = (reason) => REASONS[reason] ?? reason
