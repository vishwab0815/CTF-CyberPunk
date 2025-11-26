"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

type Profile = {
  id: number;
  name: string;
  role?: string;
  ghost_token?: string;
};

type Props = {
  loading: boolean;
  profile: Profile | null;
  error: string | null;
  hasSearched: boolean;
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1 } };

export default function Terminal({ loading, profile, error, hasSearched }: Props) {
  return (
    <div className="mt-4">
      <label className="block text-xs text-foreground/60 mb-2 uppercase">System Response</label>

      <div className="bg-[#061016]/60 border border-primary/20 rounded-xl p-4 min-h-[200px] text-primary-foreground font-mono text-sm whitespace-pre-wrap">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-primary mb-2">$ FETCHING_PROFILE...</div>
              <div className="h-2 bg-gradient-to-r from-primary to-purple-500 rounded animate-pulse" />
            </motion.div>
          )}

          {!loading && error && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-amber-400 font-semibold">⚠ ACCESS ERROR</div>
              <div className="text-foreground/60 mt-2">Error: {error}</div>
            </motion.div>
          )}

          {!loading && profile && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="space-y-2">
                <div><span className="text-primary">ProfileID:</span> <span className="text-cyan-300 font-semibold">{profile.id}</span></div>
                <div><span className="text-primary">Username:</span> <span className="text-cyan-300 font-semibold">{profile.name}</span></div>
                <div><span className="text-primary">Role:</span> <span className="text-cyan-300 font-semibold">{profile.role ?? "UNASSIGNED"}</span></div>

                {profile.ghost_token && (
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <div className="text-amber-400 font-bold">ANOMALY</div>
                    <div className="font-mono text-lime-400">{profile.ghost_token}</div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {!loading && !profile && !error && !hasSearched && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-foreground/50">$ awaiting_search_query...</div>
            </motion.div>
          )}

          {!loading && !profile && !error && hasSearched && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-foreground/60">No data returned for that ID.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
