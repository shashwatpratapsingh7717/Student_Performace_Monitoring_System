import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SemesterView = ({ user }) => {
  const { id } = useParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals Core State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editData, setEditData] = useState({ attendance: 0, mst1: 0, mst2: 0, assignments: [] });
  const [newSubjectInput, setNewSubjectInput] = useState('');

  // Chatbot Super States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatPhase, setChatPhase] = useState('setup'); 
  const [vivaSubjectsInput, setVivaSubjectsInput] = useState(''); 
  const [vivaSyllabusMap, setVivaSyllabusMap] = useState({});
  const [chatRound, setChatRound] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [studentInput, setStudentInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [finalReport, setFinalReport] = useState("");
  const [reportEmailTo, setReportEmailTo] = useState(""); 
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = window.SpeechRecognition || window.webkitSpeechRecognition ? new (window.SpeechRecognition || window.webkitSpeechRecognition)() : null;

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get(`/students/${id}?mentor_id=${user.id}`);
      setStudents(response.data);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, [id]);

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; 
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef) { alert("Voice not supported."); return; }
    if (isListening) {
      recognitionRef.stop(); setIsListening(false);
    } else {
      recognitionRef.lang = 'en-US'; recognitionRef.continuous = true; recognitionRef.interimResults = true;
      recognitionRef.onstart = () => setIsListening(true);
      recognitionRef.onend = () => setIsListening(false);
      recognitionRef.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) setStudentInput(prev => prev + " " + finalTranscript);
      };
      recognitionRef.start();
    }
  };

  const subjectsArray = vivaSubjectsInput.split(',').map(s => s.trim()).filter(s => s !== "");
  const getCombinedSyllabusContext = () => subjectsArray.map(sub => `Subject: ${sub}\nSyllabus Covered: ${vivaSyllabusMap[sub] || 'General Basics'}`).join('\n\n');

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setEditData({ attendance: student.attendance || 0, mst1: student.mst1 || 0, mst2: student.mst2 || 0, assignments: student.assignments ? [...student.assignments] : [] });
    setNewSubjectInput(''); setIsModalOpen(true);
  };

  const openChatSetup = (student) => {
    setSelectedStudent(student); setVivaSubjectsInput(''); setVivaSyllabusMap({}); setChatPhase('setup'); setIsChatOpen(true);
  };

  const startAIChatbot = async (e) => {
    e.preventDefault();
    if(subjectsArray.length === 0) { alert("Enter subjects!"); return; }
    setChatPhase('viva'); setChatRound(1); setChatHistory([]); setFinalReport(""); setIsChatLoading(true);
    try {
      const res = await axiosClient.post("/chatbot/get-question", {
        student_id: selectedStudent.id, current_round: 1, previous_chat_history: [], combined_syllabus_context: getCombinedSyllabusContext()
      });
      setCurrentQuestion(res.data.question); speakText(res.data.question);
    } catch (err) { alert("Error generating question."); setChatPhase('setup'); }
    setIsChatLoading(false);
  };

  const forceGenerateReport = async (history) => {
    setChatPhase('report'); setIsChatLoading(true);
    try {
      const res = await axiosClient.post("/chatbot/evaluate", {
        student_id: selectedStudent.id, chat_history: history, combined_syllabus_context: getCombinedSyllabusContext()
      });
      setFinalReport(res.data.report);
      setReportEmailTo(selectedStudent.parents_email || "");
    } catch (err) { alert("Error generating report."); }
    setIsChatLoading(false);
  };

  const handleNextChatRound = async () => {
    if (!studentInput.trim()) return;
    const updatedHistory = [...chatHistory, { role: "examiner", text: currentQuestion }, { role: "student", text: studentInput }];
    setChatHistory(updatedHistory); setStudentInput("");
    if(isListening) toggleListening(); 

    if (chatRound >= 3) { forceGenerateReport(updatedHistory); return; }

    setIsChatLoading(true);
    const nextRound = chatRound + 1; setChatRound(nextRound);
    try {
      const res = await axiosClient.post("/chatbot/get-question", {
        student_id: selectedStudent.id, current_round: nextRound, previous_chat_history: updatedHistory, combined_syllabus_context: getCombinedSyllabusContext()
      });
      setCurrentQuestion(res.data.question); speakText(res.data.question);
    } catch (err) { alert("Failed to fetch question."); }
    setIsChatLoading(false);
  };

  const handleSendEmail = async () => {
    if (!reportEmailTo.trim()) { alert("Enter parent's email!"); return; }
    
    // 🔥 FIX: Using user-specific keys to retrieve email credentials
    const senderEmail = localStorage.getItem(`mentorSmtpEmail_${user?.id}`);
    const senderPass = localStorage.getItem(`mentorSmtpPassword_${user?.id}`);
    
    if(!senderEmail || !senderPass) { alert("❌ Configuration incomplete! Please setup credentials in Dashboard first."); return; }
    setIsSendingEmail(true);
    try {
      await axiosClient.post("/chatbot/send-email", { to_email: reportEmailTo, student_name: selectedStudent.name, report_text: finalReport, sender_email: senderEmail, sender_password: senderPass });
      alert("✅ Report sent!");
    } catch (error) { alert("❌ Failed to send email."); }
    setIsSendingEmail(false);
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    const mappedAssignments = editData.assignments.map(a => ({ 
      id: a.id, 
      subject_name: a.subject || a.subject_name, 
      assignment_title: a.title || a.assignment_title, 
      status: a.status 
    }));
    try {
      await axiosClient.put(`/update-student/${selectedStudent.id}`, { attendance: editData.attendance, mst1: editData.mst1, mst2: editData.mst2, assignments: mappedAssignments });
      setIsModalOpen(false); fetchStudents(); 
    } catch (error) { alert("❌ Error saving data."); }
  };

  const handleFileUpload = async (assignId, file) => {
    if (!assignId) { alert("Click Save Changes first to generate ID!"); return; }
    const formData = new FormData(); formData.append("file", file);
    try {
      await axiosClient.post(`/upload-assignment/${assignId}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      alert("✅ PDF Uploaded!"); fetchStudents(); setIsModalOpen(false);
    } catch (error) { alert("❌ Error uploading."); }
  };

  const handleDeleteStudent = async (id, name) => {
    if (window.confirm(`Delete ${name}?`)) {
      try { await axiosClient.delete(`/delete-student/${id}`); fetchStudents(); } catch (err) { alert("Error."); }
    }
  };

  const handlePromoteStudents = async () => {
    const nextSem = parseInt(id) + 1;
    if (nextSem > 8) { alert("❌ Already in Final Semester!"); return; }
    if (window.confirm(`⚠️ Promote Semester ${id} to ${nextSem}?`)) {
      try {
        const res = await axiosClient.put(`/promote-students/${id}`);
        alert(`✅ ${res.data.message}`); fetchStudents();
      } catch (error) { alert("❌ Error promoting."); }
    }
  };

  const atRiskCount = students.filter(s => s.attendance < 75 || s.mst1 < 12 || s.mst2 < 12).length;
  const safeCount = students.length - atRiskCount;
  const pieData = [ { name: 'Safe', value: safeCount }, { name: 'At Risk', value: atRiskCount } ];
  const PIE_COLORS = ['#10b981', '#ef4444'];
  const chartData = students.map(s => ({ name: s.name.split(' ')[0], MST1: s.mst1, MST2: s.mst2 }));

  return (
    <div className="card" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Semester {id} Tracking Platform</h2>
        {students.length > 0 && <button onClick={handlePromoteStudents} style={{ background: '#f59e0b', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>🚀 Promote to Sem {parseInt(id) + 1}</button>}
      </div>
      
      {students.length > 0 && (
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: '400px' }}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 30]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="MST1" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="MST2" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1, background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loading ? ( <p>Loading...</p> ) : students.length === 0 ? ( <p>No records found.</p> ) : (
        <div className="table-container">
          <table className="student-table">
            <thead>
              <tr><th>Enrollment</th><th>Name</th><th>Attendance</th><th>MST 1</th><th>MST 2</th><th>Assignments</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const isAtRisk = student.attendance < 75 || student.mst1 < 12 || student.mst2 < 12;
                return (
                  <tr key={student.id} style={{ backgroundColor: isAtRisk ? '#fef2f2' : 'transparent' }}>
                    <td>{student.enroll} {isAtRisk && <span style={{ background: '#ef4444', color: 'white', padding: '2px 4px', borderRadius: '4px', fontSize: '0.65rem' }}>⚠️ Risk</span>}</td>
                    <td style={{ fontWeight: '600' }}>{student.name}</td>
                    <td style={{ color: student.attendance < 75 ? '#ef4444' : 'inherit' }}>{student.attendance}%</td>
                    <td style={{ color: student.mst1 < 12 ? '#ef4444' : 'inherit' }}>{student.mst1}/30</td>
                    <td style={{ color: student.mst2 < 12 ? '#ef4444' : 'inherit' }}>{student.mst2}/30</td>
                    <td>{student.assignmentPercent}%</td>
                    <td style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEditModal(student)} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>✏️ Edit</button>
                      <button onClick={() => openChatSetup(student)} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontWeight: 'bold' }}>🎙️ AI Oral</button>
                      <button onClick={() => handleDeleteStudent(student.id, student.name)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* 🟢 ADVANCED EDIT STUDENT MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', fontSize: '1.2rem' }}>✏️ Edit Student: {selectedStudent?.name}</h3>
            
            <form onSubmit={handleSaveChanges} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '0.85rem' }}>Attendance (%)</label>
                  <input type="number" max="100" min="0" className="login-input" style={{marginBottom: 0, width: '100%', padding: '8px', fontSize: '0.9rem'}} value={editData.attendance} onChange={(e) => setEditData({...editData, attendance: parseFloat(e.target.value)})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '0.85rem' }}>MST 1 (Max 30)</label>
                  <input type="number" max="30" min="0" className="login-input" style={{marginBottom: 0, width: '100%', padding: '8px', fontSize: '0.9rem'}} value={editData.mst1} onChange={(e) => setEditData({...editData, mst1: parseInt(e.target.value)})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '0.85rem' }}>MST 2 (Max 30)</label>
                  <input type="number" max="30" min="0" className="login-input" style={{marginBottom: 0, width: '100%', padding: '8px', fontSize: '0.9rem'}} value={editData.mst2} onChange={(e) => setEditData({...editData, mst2: parseInt(e.target.value)})} />
                </div>
              </div>

              <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b' }}>Subjects & Assignments</label>
                  <div style={{ display: 'flex', gap: '8px', width: '60%' }}>
                    <input type="text" placeholder="Add New Course" value={newSubjectInput} onChange={(e) => setNewSubjectInput(e.target.value)} className="login-input" style={{marginBottom: 0, padding: '8px 10px', flex: 1, fontSize: '0.9rem'}} />
                    <button type="button" onClick={() => {
                      if(newSubjectInput.trim() !== "") {
                        setEditData({...editData, assignments: [...editData.assignments, { id: null, subject: newSubjectInput.trim(), title: 'Assignment 1', status: 'Pending' }]});
                        setNewSubjectInput("");
                      }
                    }} style={{ background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', padding: '0 15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>➕ Add</button>
                  </div>
                </div>

                {(() => {
                  const groups = {};
                  editData.assignments.forEach((item, index) => {
                    const subj = item.subject || item.subject_name; 
                    if (!groups[subj]) groups[subj] = [];
                    groups[subj].push({ ...item, originalIndex: index });
                  });
                  if(Object.keys(groups).length === 0) return <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem' }}>No courses added yet. Add one above.</p>;

                  return Object.keys(groups).map(subName => (
                    <div key={subName} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#334155' }}>📚 {subName}</span>
                        <button type="button" onClick={() => {
                          const nextNum = groups[subName].length + 1;
                          setEditData({...editData, assignments: [...editData.assignments, { id: null, subject: subName, title: `Assignment ${nextNum}`, status: 'Pending' }]});
                        }} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>+ Add Assignment</button>
                      </div>

                      {groups[subName].map(assign => (
                        <div key={assign.id || assign.originalIndex} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px', background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="text" placeholder="Assignment Title" className="login-input" style={{ marginBottom: 0, flex: 2, padding: '6px 8px', fontSize: '0.85rem' }} value={assign.title || assign.assignment_title} onChange={(e) => { const updated = [...editData.assignments]; updated[assign.originalIndex].title = e.target.value; setEditData({ ...editData, assignments: updated }); }} />
                            <select className="login-input" style={{ marginBottom: 0, flex: 1, padding: '6px 8px', fontSize: '0.85rem' }} value={assign.status} onChange={(e) => { const updated = [...editData.assignments]; updated[assign.originalIndex].status = e.target.value; setEditData({ ...editData, assignments: updated }); }}>
                              <option value="Pending">Pending</option><option value="Submitted">Submitted</option><option value="Graded">Graded</option>
                            </select>
                            <button type="button" onClick={() => { const filtered = editData.assignments.filter((_, idx) => idx !== assign.originalIndex); setEditData({ ...editData, assignments: filtered }); }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>X</button>
                          </div>

                          <div style={{ width: '100%', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(assign.id, e.target.files[0])} style={{ fontSize: '0.75rem' }} />
                            {assign.fileUrl && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>✅ PDF Linked</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button type="submit" className="login-btn" style={{ flex: 1, margin: 0, background: '#16a34a', padding: '10px', fontSize: '1rem' }}>💾 Save Changes</button>
                <button type="button" className="login-btn" onClick={() => setIsModalOpen(false)} style={{ flex: 1, margin: 0, background: '#64748b', padding: '10px', fontSize: '1rem' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔵 AI VIVA MODAL */}
      {isChatOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', width: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ color: '#4f46e5', margin: 0, fontSize: '1.2rem' }}>🤖 AI Mentor Viva: {selectedStudent?.name}</h3>
              <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>✖</button>
            </div>

            {/* Phase 1: Setup */}
            {chatPhase === 'setup' && (
              <form onSubmit={startAIChatbot}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>Course Name(s)</label>
                  <input type="text" style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }} placeholder="e.g. Data Structures, Machine Learning" value={vivaSubjectsInput} onChange={(e) => setVivaSubjectsInput(e.target.value)} required />
                </div>
                
                {vivaSubjectsInput.trim().length > 0 && (
                  <div style={{ marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px', fontWeight: '500' }}>Provide Syllabus Topics for accurate AI Questions:</p>
                    {vivaSubjectsInput.split(',').map(s => s.trim()).filter(s => s !== "").map((sub, idx) => (
                      <div key={idx} style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Syllabus for {sub}</label>
                        <input type="text" style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }} placeholder={`Enter topics taught in ${sub}...`} value={vivaSyllabusMap[sub] || ''} onChange={(e) => setVivaSyllabusMap({...vivaSyllabusMap, [sub]: e.target.value})} />
                      </div>
                    ))}
                  </div>
                )}
                <button type="submit" className="login-btn" style={{ margin: 0, padding: '10px', fontSize: '1rem' }}>🚀 Start AI Viva</button>
              </form>
            )}

            {/* Phase 2: Viva */}
            {chatPhase === 'viva' && (
              <div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '15px', minHeight: '120px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontWeight: 'bold', color: '#4f46e5', fontSize: '0.85rem' }}>Question Round {chatRound}/3</p>
                  <p style={{ marginTop: '10px', fontSize: '0.95rem', color: '#1e293b' }}>{isChatLoading ? '🧠 AI is thinking...' : currentQuestion}</p>
                </div>
                <textarea style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical', fontSize: '0.9rem' }} rows="3" placeholder="Type student's answer here..." value={studentInput} onChange={(e) => setStudentInput(e.target.value)} disabled={isChatLoading}></textarea>
                <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                  <button onClick={toggleListening} className="login-btn" style={{ flex: 1, margin: 0, padding: '10px', fontSize: '0.95rem', background: isListening ? '#ef4444' : '#10b981' }}>{isListening ? '🛑 Stop Mic' : '🎙️ Start Mic'}</button>
                  <button onClick={handleNextChatRound} className="login-btn" style={{ flex: 2, margin: 0, padding: '10px', fontSize: '0.95rem' }} disabled={isChatLoading || !studentInput.trim()}>{chatRound >= 3 ? 'Generate Report' : 'Next Question'}</button>
                </div>
              </div>
            )}

            {/* Phase 3: Report */}
            {chatPhase === 'report' && (
              <div>
                <h4 style={{ color: '#10b981', fontSize: '1.1rem', marginBottom: '10px' }}>✅ Evaluation Complete</h4>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '250px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#334155' }}>
                  {isChatLoading ? 'Generating detailed report...' : finalReport}
                </div>
                {!isChatLoading && (
                  <div style={{ marginTop: '15px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>Parent's Email ID</label>
                    <input type="email" style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }} value={reportEmailTo} onChange={(e) => setReportEmailTo(e.target.value)} />
                    <button onClick={handleSendEmail} className="login-btn" style={{ marginTop: '15px', padding: '10px', fontSize: '1rem' }} disabled={isSendingEmail}>{isSendingEmail ? 'Sending...' : '📧 Send Report to Parents'}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default SemesterView;