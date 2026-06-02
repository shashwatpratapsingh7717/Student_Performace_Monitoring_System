import { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const Dashboard = ({ user }) => {
  const [formData, setFormData] = useState({ name: '', email: '', parents_email: '', enrollment: '', semester: 1 });
  const [msg, setMsg] = useState('');
  
  // 🔥 FIX: Har user ke liye unique local storage key, taaki data clash na ho!
  const emailKey = `mentorSmtpEmail_${user?.id}`;
  const passKey = `mentorSmtpPassword_${user?.id}`;
  
  const [mentorEmail, setMentorEmail] = useState(localStorage.getItem(emailKey) || '');
  const [mentorPassword, setMentorPassword] = useState(localStorage.getItem(passKey) || '');
  const [configMsg, setConfigMsg] = useState('');

  const fileInputRef = useRef(null);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setMsg("Saving...");
    try {
      const payload = { ...formData, mentor_id: user.id };
      const response = await axiosClient.post("/add-student", payload);
      setMsg("✅ " + response.data.message);
      setFormData({ name: '', email: '', parents_email: '', enrollment: '', semester: 1 });
    } catch (error) { setMsg("❌ Error adding student. Details might already exist."); }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const uploadData = new FormData();
    uploadData.append("file", file);
    try {
      setMsg("Uploading Excel/CSV...");
      const response = await axiosClient.post(`/bulk-upload-students?mentor_id=${user.id}`, uploadData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setMsg("✅ " + response.data.message);
    } catch(err) {
      setMsg("❌ Error in bulk upload. Check CSV format.");
    }
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveEmailConfig = (e) => {
    e.preventDefault();
    localStorage.setItem(emailKey, mentorEmail);
    localStorage.setItem(passKey, mentorPassword);
    setConfigMsg("✅ Credentials saved securely in your browser!");
    setTimeout(() => setConfigMsg(''), 3000);
  };

  return (
    <div className="card">
      <h2>Welcome back, {user?.name}</h2>
      <p style={{ marginTop: '10px', color: '#64748b', marginBottom: '2rem' }}>Manage your students and configure your communication settings below.</p>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* ADD STUDENT SECTION */}
        <div style={{ flex: 1, background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: '350px' }}>
          <h3 style={{ marginBottom: '1rem' }}>➕ Add New Student</h3>
          
          <div style={{ background: '#e0e7ff', padding: '10px', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontWeight: 'bold', color: '#3730a3', fontSize: '0.9rem', display: 'block' }}>Bulk Upload via CSV</span>
              <span style={{ fontSize: '0.75rem', color: '#4f46e5' }}>(Headers: name, email, enrollment, semester, parents_email)</span>
            </div>
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleBulkUpload} style={{ display: 'none' }} id="csv-upload" />
            <label htmlFor="csv-upload" style={{ background: '#4f46e5', color: 'white', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <UploadCloud size={16} /> Upload CSV
            </label>
          </div>

          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '10px', fontWeight: 'bold' }}>OR ADD MANUALLY</div>

          <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder="Full Name" required className="login-input" style={{ marginBottom: '0' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input type="email" placeholder="Student Email Address" required className="login-input" style={{ marginBottom: '0' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <input type="email" placeholder="Parents Email Address (For AI Report)" required className="login-input" style={{ marginBottom: '0', borderLeft: '4px solid #8b5cf6' }} value={formData.parents_email} onChange={e => setFormData({...formData, parents_email: e.target.value})} />
            <input type="text" placeholder="Enrollment No (e.g. EN202409)" required className="login-input" style={{ marginBottom: '0' }} value={formData.enrollment} onChange={e => setFormData({...formData, enrollment: e.target.value})} />
            <select className="login-input" style={{ marginBottom: '0' }} value={formData.semester} onChange={e => setFormData({...formData, semester: parseInt(e.target.value)})}>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <button type="submit" className="login-btn" style={{ marginTop: '10px' }}>Save to Database</button>
          </form>
          {msg && <p style={{ marginTop: '10px', fontWeight: 'bold', color: msg.includes('❌') ? '#ef4444' : '#16a34a', textAlign: 'center' }}>{msg}</p>}
        </div>

        {/* EMAIL CONFIGURATION SECTION */}
        <div style={{ flex: 1, background: '#e0e7ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #c7d2fe', minWidth: '350px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
            <h3 style={{ color: '#3730a3', margin: 0 }}>⚙️ Mentor Email Configuration</h3>
          </div>
          <form onSubmit={saveEmailConfig} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input type="email" placeholder="Your Gmail Address" required className="login-input" style={{ marginBottom: '0' }} value={mentorEmail} onChange={e => setMentorEmail(e.target.value)} />
            <input type="password" placeholder="16-Digit App Password" required className="login-input" style={{ marginBottom: '0' }} value={mentorPassword} onChange={e => setMentorPassword(e.target.value)} />
            
            {/* INSTRUCTIONS BOX */}
            <div style={{ background: '#ffffff', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '5px' }}>
              <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>How to get App Password?</strong>
              <ol style={{ margin: '10px 0 0 20px', padding: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.6' }}>
                <li>Go to <b>Google Account &gt; Security</b>.</li>
                <li>Turn ON <b>2-Step Verification</b>.</li>
                <li>Search for <b>"App Passwords"</b> and create one.</li>
                <li>Paste the 16-letter code here.</li>
              </ol>
            </div>

            <button type="submit" style={{ background: '#4f46e5', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}>Save Credentials</button>
          </form>
          {configMsg && <p style={{ marginTop: '10px', fontWeight: 'bold', color: '#16a34a' }}>{configMsg}</p>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;