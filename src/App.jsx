import { Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import StudentProfile from './pages/student/StudentProfile.jsx'
import StudentStart from './pages/student/StudentStart.jsx'
import Teacher from './pages/teacher/Teacher.jsx'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/teacher/*" element={<Teacher />} />
      <Route path="/student" element={<StudentStart />} />
      <Route path="/student/:profileId/*" element={<StudentProfile />} />
    </Routes>
  )
}
