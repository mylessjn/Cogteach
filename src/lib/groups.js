// Piaget age groups. Shared by the app and the server's Curate prompt.
// We only ever store the group id, never the exact age.
export const GROUPS = [
  {
    id: 'preoperational',
    label: '5–7',
    name: 'Preoperational',
    minAge: 5,
    maxAge: 7,
    reviewRequired: true,
    onePerScreen: true,
    description:
      'children aged 5 to 7 (Piaget preoperational stage): a short story with simple words, one idea per section, concrete and playful, no abstract terms',
  },
  {
    id: 'concrete',
    label: '7–11',
    name: 'Concrete operational',
    minAge: 7,
    maxAge: 11,
    reviewRequired: true,
    onePerScreen: true,
    description:
      'children aged 7 to 11 (Piaget concrete operational stage): real objects they can count, see and touch, with numbered hands-on steps',
  },
  {
    id: 'formal',
    label: '11–17',
    name: 'Formal operational',
    minAge: 11,
    maxAge: 17,
    reviewRequired: false,
    onePerScreen: false,
    description:
      'teenagers aged 11 to 17 (Piaget formal operational stage): abstract ideas, hypotheses and "what if" questions',
  },
  {
    id: 'adult',
    label: '18+',
    name: 'Adult',
    minAge: 18,
    maxAge: 120,
    reviewRequired: false,
    onePerScreen: false,
    description:
      'adult learners: concise, the big idea first, then how it applies in the real world',
  },
]

export const groupById = (id) => GROUPS.find((g) => g.id === id)

// Ages on a boundary (7, 11) go to the older group. Under 5 joins the youngest.
export function groupForAge(age) {
  if (age >= 18) return 'adult'
  if (age >= 11) return 'formal'
  if (age >= 7) return 'concrete'
  return 'preoperational'
}
