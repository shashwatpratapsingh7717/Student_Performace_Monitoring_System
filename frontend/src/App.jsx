import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SemesterView from './pages/SemesterView';


function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  
  if (!loggedInUser) return <Login onLogin={setLoggedInUser} />;
  
  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar user={loggedInUser} onLogout={() => setLoggedInUser(null)} />
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard user={loggedInUser} />} />
              <Route path="/semester/:id" element={<SemesterView user={loggedInUser} />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;