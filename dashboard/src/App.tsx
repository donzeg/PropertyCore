import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import Rooms from './pages/Rooms'
import Devices from './pages/Devices'
import Scenes from './pages/Scenes'
import Rules from './pages/Rules'
import Schedules from './pages/Schedules'
import Users from './pages/Users'

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview"  element={<Overview />} />
          <Route path="rooms"     element={<Rooms />} />
          <Route path="devices"   element={<Devices />} />
          <Route path="scenes"    element={<Scenes />} />
          <Route path="rules"     element={<Rules />} />
          <Route path="schedules" element={<Schedules />} />
          <Route path="users"     element={<Users />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
