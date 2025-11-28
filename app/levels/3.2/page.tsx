"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLevelAccess } from "@/lib/useLevelAccess";
import { Button } from "@/components/ui/button";
import { Search, Database, AlertCircle, CheckCircle2, Info, Code } from "lucide-react";
import { useSession } from "next-auth/react";
import "@/app/styles/cyber-global.css";

type ReconData = {
  totalEmployees: number;
  departments: string[];
  clearanceLevels: { level: number; count: number }[];
};

type SearchResult = {
  found: boolean;
  flagFound?: boolean;
  message: string;
  employee?: {
    employeeId: string;
    name: string;
    department: string;
    clearanceLevel: number;
    email: string;
    role: string;
    status: string;
    secretData?: string;
  };
  hint?: string;
};

export default function LevelThreeTwo() {
  const router = useRouter();
  const { canAccess, isChecking } = useLevelAccess('3.2');
  const { update } = useSession();

  // State
  const [reconData, setReconData] = useState<ReconData | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [flagFound, setFlagFound] = useState(false);

  // Fetch reconnaissance data
  useEffect(() => {
    fetchReconData();
  }, []);

  const fetchReconData = async () => {
    try {
      const res = await fetch('/api/levels/3.2');
      if (res.ok) {
        const data = await res.json();
        setReconData(data);
      }
    } catch (err) {
      console.error('Failed to fetch recon data:', err);
    }
  };

  // Submit search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchInput.trim() || loading) return;

    setLoading(true);

    try {
      // Parse JSON input or use as string
      let searchBody: any;
      try {
        searchBody = JSON.parse(searchInput);
      } catch {
        // If not JSON, treat as name search
        searchBody = { name: searchInput };
      }

      const res = await fetch('/api/levels/3.2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchBody),
      });

      const data = await res.json();

      // Add to results
      setSearchResults([data, ...searchResults].slice(0, 10)); // Keep last 10

      // Check if flag found
      if (data.flagFound && data.employee?.secretData) {
        setFlagFound(true);

        // Auto-submit flag
        setTimeout(async () => {
          const submitRes = await fetch('/api/submit-flag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              level: '3.2',
              flag: data.employee.secretData,
            }),
          });

          const submitData = await submitRes.json();

          // Refresh session
          await update();

          // Redirect after submission - use completionPage from API response
          setTimeout(() => {
            const redirectPath = submitData.completionPage || `/levels/${submitData.nextLevel}` || '/';
            router.push(redirectPath);
          }, 2000);
        }, 1000);
      }
    } catch (err: any) {
      setSearchResults([
        {
          found: false,
          message: 'Error: ' + err.message,
        },
        ...searchResults,
      ].slice(0, 10));
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden p-6">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--grid-color))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--grid-color))_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Glowing orbs */}
      <motion.div
        className="absolute -left-32 top-10 w-[500px] h-[500px] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle,#08f9ff33,transparent 70%)" }}
        animate={{ y: [0, 14, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-6xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 mb-4">
            <Database className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-cyan-300 font-mono">
              OWASP A03: Injection Vulnerability
            </span>
          </div>

          <h1
            className="text-4xl md:text-5xl font-bold mb-3 tracking-tight"
            style={{
              background: "linear-gradient(90deg,#00fff8,#8b5cff,#00eaff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            The Database Whisper
          </h1>

          <p className="text-white/70 text-lg mb-6 max-w-3xl mx-auto">
            NebulaCorp's Employee Search Portal uses a NoSQL database.
            The search function seems secure, but can you manipulate the queries
            to find the hidden administrator?
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Reconnaissance */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 p-6 bg-black/40 border border-cyan-500/30 rounded-lg backdrop-blur-xl"
          >
            <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Intelligence
            </h3>

            {reconData ? (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-white/60 mb-1">Total Employees:</p>
                  <p className="text-white font-mono text-lg">{reconData.totalEmployees}</p>
                </div>

                <div>
                  <p className="text-white/60 mb-2">Departments:</p>
                  <div className="flex flex-wrap gap-1">
                    {reconData.departments.map((dept, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/40 rounded text-xs text-cyan-300"
                      >
                        {dept}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-white/60 mb-2">Clearance Levels:</p>
                  <div className="space-y-1">
                    {reconData.clearanceLevels.map((cl, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-xs text-white/80"
                      >
                        <span>Level {cl.level}:</span>
                        <span className="font-mono">{cl.count} employee(s)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-cyan-500/20">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowHints(!showHints)}
                    className="w-full"
                  >
                    {showHints ? 'Hide Hints' : 'Show Hints'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-white/40 text-sm">Loading intelligence...</p>
            )}
          </motion.div>

          {/* Center/Right: Search Interface */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Search Box */}
            <div className="p-6 bg-black/40 border border-cyan-500/30 rounded-lg backdrop-blur-xl">
              <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Employee Search
              </h3>

              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-white/80 text-sm">Search Query:</label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-xs"
                    >
                      <Code className="w-3 h-3 mr-1" />
                      {showAdvanced ? 'Simple' : 'Advanced'}
                    </Button>
                  </div>

                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={
                      showAdvanced
                        ? '{"name": {"$ne": "Guest"}}'
                        : 'John Smith'
                    }
                    className="w-full p-3 rounded-lg bg-black/50 border border-cyan-500/30 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    disabled={loading || flagFound}
                  />

                  {showAdvanced && (
                    <p className="text-white/40 text-xs mt-2">
                      💡 Use JSON with MongoDB operators: $ne, $gt, $gte, $regex, etc.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || flagFound}
                  className="w-full bg-cyan-500 hover:bg-cyan-600"
                >
                  {loading ? 'Searching...' : 'Search Database'}
                </Button>
              </form>
            </div>

            {/* Hints */}
            <AnimatePresence>
              {showHints && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                >
                  <h4 className="text-yellow-300 font-bold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Beginner Hints
                  </h4>

                  <div className="space-y-3 text-sm text-white/80">
                    <div>
                      <p className="font-semibold text-yellow-200">💡 Hint 1: URL Parameters</p>
                      <p>The search function accepts JSON objects. You can use MongoDB query operators.</p>
                    </div>

                    <div>
                      <p className="font-semibold text-yellow-200">💡 Hint 2: NOT Equal</p>
                      <p>
                        Instead of searching FOR someone, search for everyone who is NOT someone.
                        <br />
                        Example: <code className="bg-black/30 px-1 py-0.5 rounded">{'{"name": {"$ne": "Guest"}}'}</code>
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-yellow-200">💡 Hint 3: Clearance Level</p>
                      <p>
                        High clearance employees (level 5) have access to secrets.
                        <br />
                        Try: <code className="bg-black/30 px-1 py-0.5 rounded">{'{"clearanceLevel": {"$gte": 5}}'}</code>
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-yellow-200">💡 Hint 4: Pattern Matching</p>
                      <p>
                        Use regex to find names starting with specific letters.
                        <br />
                        Try: <code className="bg-black/30 px-1 py-0.5 rounded">{'{"name": {"$regex": "^Ghost"}}'}</code>
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results */}
            {searchResults.length > 0 && (
              <div className="p-6 bg-black/40 border border-cyan-500/30 rounded-lg backdrop-blur-xl">
                <h3 className="text-lg font-bold text-cyan-300 mb-4">
                  Search Results ({searchResults.length})
                </h3>

                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {searchResults.map((result, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-lg border ${
                        result.flagFound
                          ? 'bg-green-500/10 border-green-500/50'
                          : result.found
                          ? 'bg-cyan-500/10 border-cyan-500/30'
                          : 'bg-red-500/10 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-semibold text-white/90">
                          {result.message}
                        </p>
                        {result.flagFound ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : result.found ? (
                          <Info className="w-5 h-5 text-cyan-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>

                      {result.employee && (
                        <div className="space-y-1 text-xs font-mono">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-white/50">ID:</span>{' '}
                              <span className="text-white">{result.employee.employeeId}</span>
                            </div>
                            <div>
                              <span className="text-white/50">Name:</span>{' '}
                              <span className="text-white">{result.employee.name}</span>
                            </div>
                            <div>
                              <span className="text-white/50">Department:</span>{' '}
                              <span className="text-white">{result.employee.department}</span>
                            </div>
                            <div>
                              <span className="text-white/50">Clearance:</span>{' '}
                              <span className={`font-bold ${
                                result.employee.clearanceLevel >= 5 ? 'text-red-400' : 'text-cyan-400'
                              }`}>
                                Level {result.employee.clearanceLevel}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-white/50">Email:</span>{' '}
                              <span className="text-white">{result.employee.email}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-white/50">Role:</span>{' '}
                              <span className="text-white">{result.employee.role}</span>
                            </div>
                          </div>

                          {result.employee.secretData && (
                            <div className="mt-3 p-3 bg-green-500/20 border border-green-500/50 rounded">
                              <p className="text-green-300 font-bold mb-1">🚩 SECRET DATA FOUND:</p>
                              <p className="text-green-400 font-mono text-sm">
                                {result.employee.secretData}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {result.hint && (
                        <p className="mt-2 text-xs text-yellow-300">💡 {result.hint}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Success */}
            {flagFound && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-6 bg-green-500/10 border border-green-500/50 rounded-lg text-center"
              >
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-300 mb-2">
                  NoSQL Injection Successful!
                </h2>
                <p className="text-white/80 mb-4">
                  You've exploited the vulnerable query to extract classified data.
                  This demonstrates why input sanitization is critical.
                </p>
                <p className="text-white/60 text-sm">
                  Redirecting to dashboard...
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
