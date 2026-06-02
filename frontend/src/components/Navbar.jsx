import { LogOut } from 'lucide-react';

const Navbar = ({ user, onLogout }) => (
  <div className="navbar">
    <h2 style={{ fontSize: '1.25rem', color: '#1e293b' }}>Faculty Portal</h2>
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
        <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{user.name}</span>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.role}</span>
      </div>
      <button onClick={onLogout} className="logout-btn" title="Logout"><LogOut size={18} /></button>
    </div>
  </div>
);

export default Navbar;