import { Route, Routes } from 'react-router-dom'
import { RequireRole } from './auth/RequireRole.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Student from './pages/student/Student.jsx'
import Teacher from './pages/teacher/Teacher.jsx'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login/:role" element={<Login />} />
      <Route
        path="/teacher/*"
        element={
          <RequireRole role="teacher">
            <Teacher />
          </RequireRole>
        }
      />
      <Route
        path="/student/*"
        element={
          <RequireRole role="student">
            <Student />
          </RequireRole>
        }
      />
    </Routes>
  )
}
