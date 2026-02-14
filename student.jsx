import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Award, Plus, Search, Download, CheckCircle, AlertCircle, 
  X, Eye, QrCode, FileText, Upload, Trash2, Sparkles, Zap, Briefcase, 
  LogIn, LayoutDashboard, UserCheck, GraduationCap, ChevronLeft,
  Share2, Copy, Check, Filter, Settings, LogOut, Users, MoreVertical,
  Printer
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDoc, onSnapshot, writeBatch, query, deleteDoc
} from 'firebase/firestore';
import { 
  getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken, signOut 
} from 'firebase/auth';

// --- Configuration & Initialization ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'certiverify-pro-v1';
const apiKey = ""; // Provided at runtime

// --- Gemini API Utility ---
const callGemini = async (prompt, systemInstruction = "") => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] }
  };

  const fetchWithRetry = async (retries = 0) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Gemini API Error');
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (err) {
      if (retries < 5) {
        const delay = Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(retries + 1);
      }
      throw err;
    }
  };
  return await fetchWithRetry();
};

const TEMPLATES = [
  { id: 'classic', name: 'Royal Gold', primary: '#B8860B', secondary: '#FDF5E6', accent: '#000000', border: 'double' },
  { id: 'modern', name: 'Corporate Blue', primary: '#1e40af', secondary: '#f8fafc', accent: '#1e293b', border: 'geometric' },
  { id: 'elegant', name: 'Minimal Slate', primary: '#334155', secondary: '#ffffff', accent: '#0f172a', border: 'thin' }
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('vault'); // vault, issue
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const [previewCert, setPreviewCert] = useState(null);

  const canvasRef = useRef(null);

  // Authentication Setup
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        setAuthReady(true);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Certificates
  useEffect(() => {
    if (!isLoggedIn || !user || !authReady) return;

    const q = collection(db, 'artifacts', appId, 'public', 'data', 'certificates');
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCerts(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setConnectionError(false);
      }, 
      (err) => {
        console.error("Firestore error:", err);
        setConnectionError(true);
      }
    );
    return () => unsubscribe();
  }, [isLoggedIn, user, authReady]);

  // Certificate Rendering Logic
  useEffect(() => {
    if (!previewCert || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const template = TEMPLATES.find(t => t.id === previewCert.template) || TEMPLATES[0];

    // Background
    ctx.fillStyle = template.secondary;
    ctx.fillRect(0, 0, 1000, 700);

    // Borders
    ctx.strokeStyle = template.primary;
    if (template.border === 'double') {
      ctx.lineWidth = 20;
      ctx.strokeRect(30, 30, 940, 640);
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 60, 880, 580);
    } else if (template.border === 'geometric') {
      ctx.lineWidth = 40;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(1000, 0); ctx.lineTo(1000, 50); ctx.lineTo(50, 50); ctx.lineTo(50, 700); ctx.lineTo(0, 700); ctx.closePath();
      ctx.fill();
      ctx.strokeRect(50, 50, 900, 600);
    } else {
      ctx.lineWidth = 1;
      ctx.strokeRect(50, 50, 900, 600);
    }

    ctx.fillStyle = template.accent;
    ctx.textAlign = 'center';
    
    // Text Elements
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('OFFICIAL ACCREDITED CREDENTIAL', 500, 110);
    
    ctx.font = '900 68px serif';
    ctx.fillStyle = template.primary;
    ctx.fillText('CERTIFICATE', 500, 200);
    ctx.font = '300 28px serif';
    ctx.fillText('OF ACHIEVEMENT', 500, 240);
    
    ctx.font = 'italic 20px serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('This is to certify that', 500, 320);
    
    ctx.font = 'bold 54px sans-serif';
    ctx.fillStyle = template.accent;
    ctx.fillText(previewCert.studentName.toUpperCase(), 500, 390);
    
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('has successfully completed the program requirements for', 500, 440);
    
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = template.primary;
    ctx.fillText(previewCert.courseName, 500, 490);
    
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`ISSUED ON: ${previewCert.issueDate}`, 500, 540);

    // QR Code
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(previewCert.certificateCode)}`;
    const qrImg = new Image();
    qrImg.crossOrigin = "anonymous";
    qrImg.onload = () => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(790, 510, 140, 140);
      ctx.drawImage(qrImg, 800, 520, 120, 120);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText('VERIFY ONLINE', 860, 660);
    };
    qrImg.src = qrUrl;

    // Footer Info
    ctx.font = '12px monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'left';
    ctx.fillText(`VERIFICATION ID: ${previewCert.certificateCode}`, 80, 660);
    
    // Registrar Signature Line
    ctx.strokeStyle = template.accent;
    ctx.beginPath(); ctx.moveTo(150, 600); ctx.lineTo(350, 600); ctx.stroke();
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Institutional Registrar', 250, 630);

  }, [previewCert]);

  const handleDownload = () => {
    if (!canvasRef.current || !previewCert) return;
    const link = document.createElement('a');
    link.download = `Certificate_${previewCert.studentName.replace(/\s+/g, '_')}.png`;
    link.href = canvasRef.current.toDataURL('image/png', 1.0);
    link.click();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this certificate? This action is permanent.")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'certificates', id));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // --- Login View ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 animate-fade-in">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-xl shadow-indigo-200 mb-6">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Portal</h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-2">CertiVerify Secure Access</p>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); setIsLoggedIn(true); }} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1">Admin ID / Email</label>
              <input 
                type="text" 
                required 
                className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-bold placeholder:text-slate-300" 
                placeholder="admin@institution.edu" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1">Access Token</label>
              <input 
                type="password" 
                required 
                className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-bold placeholder:text-slate-300" 
                placeholder="••••••••" 
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <LogIn className="w-5 h-5" /> Sign In to Dashboard
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-slate-50 flex flex-col items-center gap-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Powered by Gemini AI Engine</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Dashboard Components ---
  
  const Sidebar = () => (
    <div className="w-72 bg-white border-r border-slate-100 flex flex-col sticky top-0 h-screen">
      <div className="p-8">
        <div className="flex items-center gap-2 font-black text-2xl tracking-tighter text-indigo-600 mb-10">
          <ShieldCheck className="w-8 h-8" /> CertiVerify
        </div>
        
        <nav className="space-y-2">
          <button 
            onClick={() => setActiveTab('vault')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'vault' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
          >
            <LayoutDashboard className="w-5 h-5" /> Certificate Vault
          </button>
          <button 
            onClick={() => setActiveTab('issue')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'issue' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
          >
            <Plus className="w-5 h-5" /> Issue Credentials
          </button>
          <div className="py-4 px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-6">Organization</div>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-all">
            <Users className="w-5 h-5" /> Students
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-all">
            <Settings className="w-5 h-5" /> Settings
          </button>
        </nav>
      </div>
      
      <div className="mt-auto p-8 border-t border-slate-50">
        <button 
          onClick={() => {
            signOut(auth).then(() => {
              setIsLoggedIn(false);
              setUser(null);
            });
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
      </div>
    </div>
  );

  const CertificateVault = () => {
    const filteredCerts = certs.filter(c => 
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.certificateCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCopy = (id, code) => {
      const tempInput = document.createElement("input");
      tempInput.value = code;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
      
      setCopyFeedback(id);
      setTimeout(() => setCopyFeedback(null), 2000);
    };

    return (
      <div className="animate-fade-in">
        {connectionError && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-center gap-3 animate-slide-up">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-bold">Connecting to secure vault... Check your connectivity.</p>
          </div>
        )}

        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Institutional Vault</h2>
            <p className="text-slate-400 font-bold text-sm mt-1">Total {certs.length} credentials successfully recorded.</p>
          </div>
          <div className="relative group w-96">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all font-bold shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Program</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Verification ID</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCerts.map((cert) => (
                <tr key={cert.id} className="group hover:bg-indigo-50/30 transition-all">
                  <td className="px-8 py-6 font-black text-slate-900">{cert.studentName}</td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-white border border-slate-100 rounded-lg text-xs font-bold text-slate-600">{cert.courseName}</span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <button 
                      onClick={() => handleCopy(cert.id, cert.certificateCode)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-indigo-600 font-mono text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all border border-slate-200"
                    >
                      {cert.certificateCode} {copyFeedback === cert.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setPreviewCert(cert)}
                        title="Preview & Download" 
                        className="p-3 bg-white text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 shadow-sm transition-all"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(cert.id)}
                        title="Revoke Credential" 
                        className="p-3 bg-white text-slate-400 hover:text-red-600 rounded-xl border border-slate-100 shadow-sm transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCerts.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-8 py-20 text-center text-slate-400 font-bold italic tracking-widest text-sm uppercase">No credentials found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const IssuePortal = () => {
    const [isBulk, setIsBulk] = useState(false);
    const [bulkData, setBulkData] = useState([]);
    const [formData, setFormData] = useState({ 
      studentName: '', 
      courseName: '', 
      issueDate: new Date().toISOString().split('T')[0], 
      template: 'classic' 
    });
    const [aiBusy, setAiBusy] = useState(false);

    const handleAIPolish = async () => {
      if (!formData.courseName) return;
      setAiBusy(true);
      try {
        const prompt = `Rewrite this rough course title into a professional, formal academic certificate program title: "${formData.courseName}". Respond with ONLY the title.`;
        const result = await callGemini(prompt, "You are a professional University Registrar.");
        setFormData({ ...formData, courseName: result.trim() });
      } catch (err) {
        console.error("AI polishing failed", err);
      } finally {
        setAiBusy(false);
      }
    };

    const handleBulkFile = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const rows = ev.target.result.split('\n').filter(r => r.trim());
        const data = rows.slice(1).map(r => {
          const cols = r.split(',').map(c => c.trim());
          return { studentName: cols[0], courseName: cols[1], issueDate: cols[2] || formData.issueDate };
        }).filter(d => d.studentName && d.courseName);
        setBulkData(data);
      };
      reader.readAsText(file);
    };

    const handleIssue = async (e) => {
      e.preventDefault();
      if (!user) return;
      setLoading(true);
      const batch = writeBatch(db);
      const items = isBulk ? bulkData : [formData];
      
      try {
        items.forEach(item => {
          const id = `CV-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'certificates', id);
          batch.set(ref, { 
            ...item, 
            template: formData.template, 
            certificateCode: id, 
            createdAt: new Date().toISOString() 
          });
        });

        await batch.commit();
        setLoading(false);
        setActiveTab('vault');
        setBulkData([]);
      } catch (err) {
        console.error("Issuance error", err);
        setLoading(false);
      }
    };

    return (
      <div className="max-w-4xl mx-auto animate-slide-up">
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Credential Generation</h2>
          <p className="text-slate-400 font-bold text-sm mt-2">Create professional digital certificates with AI assistance.</p>
        </div>

        <div className="bg-white rounded-[3rem] shadow-2xl p-10 border border-slate-100">
          <div className="flex justify-center gap-2 p-1.5 bg-slate-100 rounded-2xl mb-12 w-fit mx-auto">
            <button onClick={() => setIsBulk(false)} className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${!isBulk ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>Single Entry</button>
            <button onClick={() => setIsBulk(true)} className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${isBulk ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>Bulk CSV Upload</button>
          </div>

          <form onSubmit={handleIssue} className="space-y-10">
            {!isBulk ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">Recipient Full Name</label>
                  <input required type="text" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-bold" value={formData.studentName} onChange={e => setFormData({...formData, studentName: e.target.value})} placeholder="Jane Doe" />
                </div>
                <div className="space-y-2 relative">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">Program / Course Name</label>
                  <input required type="text" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-bold pr-36" value={formData.courseName} onChange={e => setFormData({...formData, courseName: e.target.value})} placeholder="Web Architecture" />
                  <button type="button" onClick={handleAIPolish} disabled={aiBusy} className="absolute right-3 top-[38px] px-3 py-2 bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black hover:bg-indigo-200 flex items-center gap-2 transition-all shadow-sm border border-indigo-200">
                    {aiBusy ? <Zap className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI POLISH
                  </button>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">Issue Date</label>
                  <input required type="date" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-bold" value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} />
                </div>
              </div>
            ) : (
              <div className="p-12 border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50 text-center relative hover:bg-white transition-all group overflow-hidden">
                <Upload className="w-16 h-16 text-slate-300 mx-auto mb-6 group-hover:text-indigo-400 transition-colors" />
                <p className="font-black text-slate-700 text-xl">Upload CSV from Excel</p>
                <input type="file" accept=".csv" onChange={handleBulkFile} className="absolute inset-0 opacity-0 cursor-pointer" />
                {bulkData.length > 0 && (
                  <div className="mt-8 inline-flex items-center gap-3 px-6 py-2 bg-emerald-50 text-emerald-600 rounded-full font-black border border-emerald-100 shadow-sm animate-bounce">
                    <CheckCircle className="w-5 h-5" /> {bulkData.length} Recipients Loaded
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">Select Visual Template</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {TEMPLATES.map(t => (
                  <button 
                    key={t.id} 
                    type="button" 
                    onClick={() => setFormData({...formData, template: t.id})} 
                    className={`p-5 rounded-3xl border-4 text-left transition-all ${formData.template === t.id ? 'border-indigo-600 bg-indigo-50 shadow-lg' : 'border-slate-50 bg-slate-50 hover:border-slate-100'}`}
                  >
                    <div className="w-full h-12 rounded-xl mb-3 shadow-inner" style={{ backgroundColor: t.primary }}></div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{t.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <button 
              disabled={loading || (isBulk && bulkData.length === 0)} 
              className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 text-lg"
            >
              {loading ? 'Finalizing Records...' : `Issue ${isBulk ? bulkData.length : '1'} Certificate(s)`}
            </button>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar />
      <main className="flex-1 p-12 overflow-y-auto h-screen scroll-smooth relative">
        {!authReady ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 font-bold uppercase tracking-widest text-xs">
            <Zap className="w-8 h-8 animate-pulse text-indigo-300" />
            Synchronizing Secure Nodes...
          </div>
        ) : (
          <>
            {activeTab === 'vault' && <CertificateVault />}
            {activeTab === 'issue' && <IssuePortal />}
          </>
        )}

        {/* --- Fullscreen Preview Modal --- */}
        {previewCert && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white rounded-[3rem] w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-slide-up">
              <div className="flex-1 bg-slate-100 p-8 flex items-center justify-center">
                <div className="shadow-2xl bg-white rounded-sm overflow-hidden">
                  <canvas 
                    ref={canvasRef} 
                    width="1000" 
                    height="700" 
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
              
              <div className="w-full md:w-96 p-10 flex flex-col bg-white border-l border-slate-100">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Preview</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Institutional Credential</p>
                  </div>
                  <button onClick={() => setPreviewCert(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
                </div>

                <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Student Name</span>
                    <p className="text-lg font-bold text-slate-900">{previewCert.studentName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Qualification</span>
                    <p className="text-lg font-bold text-slate-900 leading-tight">{previewCert.courseName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Certificate ID</span>
                    <p className="text-sm font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg break-all">{previewCert.certificateCode}</p>
                  </div>
                </div>

                <div className="mt-10 space-y-3 pt-6 border-t border-slate-50">
                  <button 
                    onClick={handleDownload}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    <Download className="w-5 h-5" /> Download PNG
                  </button>
                  <button 
                    onClick={() => {
                      const text = `Certificate for ${previewCert.studentName} (${previewCert.courseName}). ID: ${previewCert.certificateCode}`;
                      navigator.clipboard.writeText(text);
                      alert("Sharing link copied to clipboard!");
                    }}
                    className="w-full py-5 bg-white text-indigo-600 border-2 border-indigo-600 rounded-2xl font-black hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    <Share2 className="w-5 h-5" /> Share Access
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; overflow: hidden; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
    </div>
  );
}
