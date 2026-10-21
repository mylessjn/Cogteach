import { api } from '../../kid/claim.js'
import { publishVersion } from '../../lib/data.js'

// Publishes one age version. The 5–7 group also gets each section read aloud
// once now (Inworld TTS), so students never call the AI.
export async function publishWithAudio(teacherId, classId, lessonId, groupId, version) {
  let audio = null
  if (groupId === 'preoperational') {
    audio = await Promise.all(
      version.sections.map(async (s) => {
        const text = [s.heading, s.body, s.activity].filter(Boolean).join('. ')
        return (await api(teacherId, 'POST', '/api/speak', { text })).audio
      }),
    )
  }
  await publishVersion(classId, lessonId, groupId, version, teacherId, audio)
}
