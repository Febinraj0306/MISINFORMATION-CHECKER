import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Upload, 
  FileText, 
  Search, 
  Cpu, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  Share2, 
  Image as ImageIcon,
  History,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Copy,
  Info
} from 'lucide-react';
import Tesseract from 'tesseract.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [claim, setClaim] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('idle'); // 'idle' | 'searching' | 'analyzing'
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [shareCopied, setShareCopied] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch recent check history from the backend
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching check history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Handle claim text submission
  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setResult(null);

    // Validation
    const trimmed = claim.trim();
    if (!trimmed) {
      setError('Please paste or type a claim to verify.');
      return;
    }

    const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 5) {
      setError('Claim is too short. Please write at least 5 words to ensure our search engine has enough context.');
      return;
    }

    setLoading(true);
    setLoadingStep('searching');

    // Simulate multi-stage loader transitions for smoother UX
    const loaderTimer = setTimeout(() => {
      setLoadingStep('analyzing');
    }, 2000);

    try {
      const res = await fetch(`${API_BASE}/api/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: trimmed }),
      });

      clearTimeout(loaderTimer);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server failed to process verification.');
      }

      setResult(data);
      fetchHistory(); // Refresh history list
    } catch (err) {
      console.error(err);
      setError(err.message || 'Network error occurred. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setLoadingStep('idle');
    }
  };

  // OCR Image Upload handler
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    performOcr(file);
  };

  const performOcr = async (file) => {
    setError(null);
    setOcrLoading(true);
    setOcrProgress(0);

    try {
      const { data } = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          }
        }
      );
      
      const extractedText = data.text.trim();
      if (extractedText.length > 0) {
        setClaim(extractedText);
      } else {
        setError('Could not extract any readable text from this image. Please try pasting the claim text manually.');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setError('OCR extraction failed. Please paste the claim manually.');
    } finally {
      setOcrLoading(false);
      setOcrProgress(0);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      performOcr(file);
    } else {
      setError('Please drop a valid image file (.png, .jpg, .jpeg).');
    }
  };

  // Share result generator (Copies details to Clipboard)
  const handleShare = () => {
    if (!result) return;
    const borderDecor = {
      TRUE: '🟢 TRUE',
      FALSE: '🔴 FALSE',
      MISLEADING: '🟡 MISLEADING',
      UNVERIFIED: '⚪ UNVERIFIED'
    }[result.verdict];

    const shareText = `🛡️ *TruthCheck Verdict* 🛡️
Claim: "${result.text}"

Verdict: ${borderDecor} (Confidence: ${result.confidence}%)
Reasoning: ${result.reasoning}

🔗 Verified with Search Grounding. Check it out at TruthCheck.`;

    navigator.clipboard.writeText(shareText)
      .then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      })
      .catch((err) => console.error('Failed to copy text:', err));
  };

  // Helper to load historical claim for view
  const loadHistoricalClaim = (item) => {
    setClaim(item.text);
    setResult(item);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Word counter helper
  const getWordCount = () => {
    return claim.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  // Get color schemes dynamically based on verdict
  const getVerdictTheme = (verdict) => {
    switch (verdict) {
      case 'TRUE':
        return {
          bg: 'bg-emerald-950/40',
          border: 'border-emerald-500/40',
          glow: 'glow-green',
          text: 'text-emerald-400',
          badgeBg: 'bg-emerald-500/20',
          badgeText: 'text-emerald-300',
          progressBg: 'bg-emerald-500',
          icon: <CheckCircle className="w-8 h-8 text-emerald-400" />
        };
      case 'FALSE':
        return {
          bg: 'bg-red-950/40',
          border: 'border-red-500/40',
          glow: 'glow-red',
          text: 'text-red-400',
          badgeBg: 'bg-red-500/20',
          badgeText: 'text-red-300',
          progressBg: 'bg-red-500',
          icon: <XCircle className="w-8 h-8 text-red-400" />
        };
      case 'MISLEADING':
        return {
          bg: 'bg-amber-950/40',
          border: 'border-amber-500/40',
          glow: 'glow-yellow',
          text: 'text-amber-400',
          badgeBg: 'bg-amber-500/20',
          badgeText: 'text-amber-300',
          progressBg: 'bg-amber-500',
          icon: <AlertTriangle className="w-8 h-8 text-amber-400" />
        };
      case 'UNVERIFIED':
      default:
        return {
          bg: 'bg-slate-900/60',
          border: 'border-slate-500/40',
          glow: 'glow-gray',
          text: 'text-slate-300',
          badgeBg: 'bg-slate-500/20',
          badgeText: 'text-slate-300',
          progressBg: 'bg-slate-500',
          icon: <HelpCircle className="w-8 h-8 text-slate-300" />
        };
    }
  };

  const activeTheme = result ? getVerdictTheme(result.verdict) : null;

  return (
    <div className="min-h-screen bg-radial pb-12">
      {/* Top Banner / Navbar */}
      <header className="border-b border-gray-800 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setClaim(''); setResult(null); setError(null); }}>
            <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/10">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                TruthCheck
              </span>
              <span className="text-[10px] block text-emerald-400 font-semibold tracking-wider uppercase -mt-1">
                Search-Grounded AI
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 mt-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Stop Misinformation in its Tracks
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Paste WhatsApp forwards, social media claims, or upload screenshots. 
            Our system searches live web sources and analyzes claim integrity in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Claim Input Section (7 Columns) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span>Verify Claim Details</span>
              </h2>

              <form onSubmit={handleVerify} className="space-y-4">
                {/* Input Textarea */}
                <div className="relative">
                  <textarea
                    value={claim}
                    onChange={(e) => setClaim(e.target.value)}
                    placeholder="Paste a forwarded message or claim here (minimum 5 words)..."
                    className="w-full h-44 bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition resize-none text-sm"
                    maxLength={1000}
                    disabled={loading || ocrLoading}
                  />
                  <div className="absolute bottom-3 right-3 flex items-center space-x-2 text-[11px] text-slate-500">
                    <span className={getWordCount() >= 5 ? 'text-emerald-400' : 'text-slate-500'}>
                      {getWordCount()} words
                    </span>
                    <span>/</span>
                    <span>1000 chars</span>
                  </div>
                </div>

                {/* Drag and Drop / OCR Upload Section */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    ocrLoading 
                      ? 'border-emerald-500/50 bg-emerald-500/5' 
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/30 hover:bg-slate-950/60'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden" 
                    disabled={loading || ocrLoading}
                  />
                  {ocrLoading ? (
                    <div className="flex flex-col items-center space-y-2">
                      <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                      <p className="text-xs text-slate-300 font-medium">Extracting text from image...</p>
                      <div className="w-48 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">{ocrProgress}% complete</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-1">
                      <Upload className="w-6 h-6 text-slate-400" />
                      <p className="text-xs text-slate-300 font-medium">
                        Drag screenshot here or <span className="text-emerald-400 underline">browse</span>
                      </p>
                      <p className="text-[10px] text-slate-500">Extracts text instantly using OCR</p>
                    </div>
                  )}
                </div>

                {/* Error Box */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start space-x-3 text-red-300 text-xs">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Action Button */}
                <button
                  type="submit"
                  disabled={loading || ocrLoading}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-center space-x-2 ${
                    loading || ocrLoading
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-400 hover:to-teal-500 active:scale-[0.99] hover:shadow-emerald-500/10'
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing claim...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>Verify Credibility</span>
                    </>
                  )}
                </button>
              </form>

              {/* Steps Loader Overlay */}
              {loading && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
                  <div className="space-y-6 max-w-sm">
                    {/* Status Circle Animation */}
                    <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin"></div>
                      {loadingStep === 'searching' ? (
                        <Search className="w-6 h-6 text-emerald-400 animate-pulse" />
                      ) : (
                        <Cpu className="w-6 h-6 text-emerald-400 animate-bounce" />
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-bold text-white text-base">
                        {loadingStep === 'searching' ? 'Grounding Facts' : 'Analyzing claim'}
                      </h3>
                      <p className="text-xs text-slate-400 h-10 transition-all duration-300">
                        {loadingStep === 'searching' 
                          ? 'Searching the web for credible sources and official facts...' 
                          : 'Evaluating references with Gemini Pro and forming verdict...'}
                      </p>
                    </div>

                    {/* Step progress list */}
                    <div className="flex flex-col items-start space-y-2.5 bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-xs">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${loadingStep === 'searching' ? 'bg-emerald-500 animate-ping' : 'bg-emerald-500/40'}`} />
                        <span className={loadingStep === 'searching' ? 'text-white font-medium' : 'text-slate-500'}>
                          Searching for sources...
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${loadingStep === 'analyzing' ? 'bg-emerald-500 animate-ping' : 'bg-slate-800'}`} />
                        <span className={loadingStep === 'analyzing' ? 'text-white font-medium' : 'text-slate-500'}>
                          Analyzing claim veracity...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Results & History (5 Columns) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Verdict Result Card */}
            {result ? (
              <div className={`glass-card rounded-2xl p-6 ${activeTheme.bg} ${activeTheme.border} ${activeTheme.glow} transition-all duration-500 animate-fade-in`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">
                      Verification Result
                    </span>
                    <div className="flex items-center space-x-2.5">
                      <span className={`text-2xl font-black ${activeTheme.text}`}>
                        {result.verdict}
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 font-bold rounded-full uppercase ${activeTheme.badgeBg} ${activeTheme.badgeText}`}>
                        {result.verdict}
                      </span>
                    </div>
                  </div>
                  {activeTheme.icon}
                </div>

                {/* Confidence Meter */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Confidence Score</span>
                    <span className={`font-bold ${activeTheme.text}`}>{result.confidence}%</span>
                  </div>
                  <div className="w-full bg-slate-950/60 rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${activeTheme.progressBg}`}
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Reasoning Description */}
                <div className="mt-5 bg-slate-950/40 rounded-xl p-4 border border-slate-800/60">
                  <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center space-x-1">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span>AI Reasoning</span>
                  </p>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {result.reasoning}
                  </p>
                </div>

                {/* Sources Used */}
                <div className="mt-5 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 block">
                    Grounded Sources ({result.sources?.length || 0})
                  </span>
                  {result.sources && result.sources.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {result.sources.map((src, i) => (
                        <a 
                          key={i}
                          href={src.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition duration-200"
                        >
                          <span className="truncate max-w-[140px] font-medium">{src.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic block">
                      No external sources linked.
                    </span>
                  )}
                </div>

                {/* Share Option */}
                <button
                  onClick={handleShare}
                  className="mt-6 w-full py-2 px-4 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition"
                >
                  {shareCopied ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Copied Report to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Share Verdict Card</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              // Empty Result Placeholder
              <div className="glass-card rounded-2xl p-8 text-center text-slate-500 flex flex-col items-center justify-center h-72 border border-slate-800/40">
                <Shield className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
                <p className="text-sm font-semibold text-slate-400">Awaiting Verification</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[220px] mx-auto">
                  Submit a claim to view credibility rating and grounded evidence.
                </p>
              </div>
            )}

            {/* Recent Checks List */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Recent Verifications</span>
              </h3>

              {history.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {history.map((item, idx) => {
                    const statusTextColors = {
                      TRUE: 'text-emerald-400',
                      FALSE: 'text-red-400',
                      MISLEADING: 'text-amber-400',
                      UNVERIFIED: 'text-slate-400'
                    };
                    const statusBorderColors = {
                      TRUE: 'border-emerald-500/20 bg-emerald-500/5',
                      FALSE: 'border-red-500/20 bg-red-500/5',
                      MISLEADING: 'border-amber-500/20 bg-amber-500/5',
                      UNVERIFIED: 'border-slate-800 bg-slate-900/10'
                    };

                    return (
                      <div 
                        key={idx}
                        onClick={() => loadHistoricalClaim(item)}
                        className={`p-3 rounded-xl border text-left cursor-pointer hover:border-slate-600 transition flex items-start justify-between space-x-3 ${statusBorderColors[item.verdict]}`}
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs text-slate-300 font-semibold truncate">
                            {item.text}
                          </p>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${statusTextColors[item.verdict]}`}>
                            {item.verdict} • {item.confidence}% Confidence
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">No verification history available.</p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 mt-16 text-center text-xs text-slate-600">
        <p>© {new Date().getFullYear()} TruthCheck. Fact-checking results generated by search-grounded AI.</p>
      </footer>
    </div>
  );
}
