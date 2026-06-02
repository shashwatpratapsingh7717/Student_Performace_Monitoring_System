import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Bot } from 'lucide-react';
const Sidebar = () => (
  <div className="sidebar">
    <div className="brand"><Bot size={28} /> AI Mentor</div>
    <div className="menu">
      <NavLink to="/" className={({isActive}) => isActive ? "menu-item active" : "menu-item"}><LayoutDashboard size={20} /> Dashboard</NavLink>
      <div style={{ padding: '1rem 0 0.5rem 1rem', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>SEMESTERS</div>
      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
        <NavLink key={sem} to={`/semester/${sem}`} className={({isActive}) => isActive ? "menu-item active" : "menu-item"}><BookOpen size={20} /> Semester {sem}</NavLink>
      ))}
    </div>
  </div>
);
export default Sidebar;