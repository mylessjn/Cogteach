// Learning stages (Piaget, plus andragogy for adults). Shared by the app and
// the server. We only ever store the group id, never the age or birthday.
export const GROUPS = [
  {
    id: 'preoperational',
    label: '3–6',
    name: 'Early childhood',
    stage: 'Preoperational',
    minAge: 3,
    maxAge: 6,
    reviewRequired: true,
    pictures: true,
  },
  {
    id: 'concrete',
    label: '7–11',
    name: 'Middle childhood',
    stage: 'Concrete operational',
    minAge: 7,
    maxAge: 11,
    reviewRequired: true,
    pictures: true,
  },
  {
    id: 'formal',
    label: '12–18',
    name: 'Adolescence',
    stage: 'Formal operational',
    minAge: 12,
    maxAge: 18,
    reviewRequired: false,
    pictures: false,
  },
  {
    id: 'adult',
    label: '19+',
    name: 'Adulthood',
    stage: 'Andragogy',
    minAge: 19,
    maxAge: 120,
    reviewRequired: false,
    pictures: false,
  },
]

export const groupById = (id) => GROUPS.find((g) => g.id === id)

export function groupForAge(age) {
  if (age >= 19) return 'adult'
  if (age >= 12) return 'formal'
  if (age >= 7) return 'concrete'
  return 'preoperational'
}
