import { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { Bot } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [regData, setRegData] = useState({ name: '', email: '', mobile: '', password: '' });
  const [loginStep, setLoginStep] = useState(1); 
  const [loginMobile, setLoginMobile] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await axiosClient.post("/register-mentor", regData);
      alert("✅ Registration Successful! Please login."); setIsLoginView(true);
    } catch (err) { alert("❌ Error in registration."); }
    setLoading(false);
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await axiosClient.post("/login/request-otp", { mobile: loginMobile });
      alert(`✅ OTP Sent! (Testing OTP is: ${res.data.dev_otp})`); setLoginStep(2);
    } catch (err) { alert("❌ Invalid Mobile Number."); }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await axiosClient.post("/login/verify-otp", { mobile: loginMobile, otp: loginOtp });
      onLogin(res.data.mentor); 
    } catch (err) { alert("❌ Invalid OTP!"); }
    setLoading(false);
  };

  return (
    <div className="login-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f1f5f9' }}>
      <div className="login-card" style={{ background: 'white', padding: '2.5rem', borderRadius: '16px', width: '100%', maxWidth: '400px' }}>
        <Bot size={50} color="#4f46e5" style={{ margin: '0 auto', display: 'block' }} />
        <h2 style={{ textAlign: 'center', marginTop: '1rem', color: '#1e293b' }}>{isLoginView ? "Faculty Login" : "Mentor Registration"}</h2>
        {isLoginView ? (
          <div style={{ marginTop: '1.5rem' }}>
            {loginStep === 1 ? (
              <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input type="text" placeholder="Mobile Number" className="login-input" value={loginMobile} onChange={e => setLoginMobile(e.target.value)} required />
                <button type="submit" className="login-btn">{loading ? "Sending..." : "Get OTP"}</button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input type="text" placeholder="Enter 6-Digit OTP" className="login-input" value={loginOtp} onChange={e => setLoginOtp(e.target.value)} required />
                <button type="submit" className="login-btn">Verify & Login</button>
              </form>
            )}
            <p style={{ textAlign: 'center', marginTop: '20px' }}>New Faculty? <span onClick={() => setIsLoginView(false)} style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 'bold' }}>Register</span></p>
          </div>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '1.5rem' }}>
            <input type="text" placeholder="Full Name" className="login-input" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} required />
            <input type="email" placeholder="Email" className="login-input" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} required />
            <input type="text" placeholder="Mobile" className="login-input" value={regData.mobile} onChange={e => setRegData({...regData, mobile: e.target.value})} required />
            <input type="password" placeholder="Password" className="login-input" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} required />
            <button type="submit" className="login-btn">Register Now</button>
            <p style={{ textAlign: 'center' }}>Registered? <span onClick={() => setIsLoginView(true)} style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 'bold' }}>Login</span></p>
          </form>
        )}
      </div>
    </div>
  );
};
export default Login;