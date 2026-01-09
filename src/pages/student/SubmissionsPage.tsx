import { useEffect, useState, useRef } from "react";
import { SubmissionsAPI, type Submission } from "@/api/submissions.api";
import { useAuth } from "@/context/AuthContext";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { FileCheck, Loader2, Clock, CheckCircle, XCircle, ExternalLink, X, Upload, Gift, Coins } from "lucide-react";
import { Modal } from "@/components/Modal";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import LevelUpAnimation from "@/components/LevelUpAnimation";

export default function StudentSubmissionsPage() {
  const { firebaseUser } = useAuth();
  const { darkMode, accentColor } = useTheme();
  const theme = getThemeClasses(darkMode, accentColor);
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [imageModal, setImageModal] = useState<{ open: boolean; url: string }>({ open: false, url: "" });
  const [resubmitting, setResubmitting] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);
  const [rewardModal, setRewardModal] = useState<{ open: boolean; xp: number; gold: number; leveledUp: boolean; newLevel?: number; taskTitles?: string[] } | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    if (!firebaseUser) return;
    try {
      setLoading(true);
      const data = await SubmissionsAPI.listForStudent();
      setSubmissions(data);
    } catch (err) {
      console.error("Failed to load submissions", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResubmit(sub: Submission, file: File) {
    if (!firebaseUser || !sub.courseId || !sub.moduleId || !sub.taskId) return;
    
    try {
      setResubmitting(sub.submissionId);
      
      // Upload new image with correct path structure
      const storage = getStorage();
      const timestamp = Date.now();
      const storageRef = ref(storage, `submissions/${sub.courseId}/${sub.moduleId}/${sub.taskId}/${firebaseUser.uid}/${timestamp}_${file.name}`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);

      // Create new submission (will replace old one)
      await SubmissionsAPI.create(sub.taskId, sub.courseId, sub.moduleId, imageUrl);
      
      // Reload submissions
      await loadSubmissions();
    } catch (err) {
      console.error("Failed to resubmit", err);
      alert("Failed to resubmit. Please try again.");
    } finally {
      setResubmitting(null);
    }
  }

  function handleFileSelect(sub: Submission, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      handleResubmit(sub, file);
    }
  }

  async function handleClaimReward(sub: Submission) {
    if (!firebaseUser || !sub.courseId || !sub.moduleId || !sub.taskId) return;
    
    try {
      setClaiming(sub.submissionId);
      const result = await SubmissionsAPI.claim(sub.taskId, sub.courseId, sub.moduleId);
      
      // Show reward modal with XP and gold
      setRewardModal({
        open: true,
        xp: result.xpGained || 0,
        gold: result.goldGained || 0,
        leveledUp: result.leveledUp || false,
        newLevel: result.newLevel,
        taskTitles: [sub.taskTitle || "Task"]
      });
      
      // Reload submissions to update claimed status
      await loadSubmissions();
    } catch (err) {
      console.error("Failed to claim reward", err);
      alert("Failed to claim reward. Please try again.");
    } finally {
      setClaiming(null);
    }
  }

  async function handleClaimAllRewards() {
    if (!firebaseUser) return;
    
    // Find all approved unclaimed submissions
    const claimable = submissions.filter(sub => 
      sub.status === "approved" && 
      !sub.claimedAt && 
      sub.courseId && 
      sub.moduleId && 
      sub.taskId
    );
    
    if (claimable.length === 0) {
      alert("No rewards to claim!");
      return;
    }
    
    try {
      setClaimingAll(true);
      let totalXP = 0;
      let totalGold = 0;
      let leveledUp = false;
      let newLevel: number | undefined;
      const taskTitles: string[] = [];
      
      // Claim all rewards
      for (const sub of claimable) {
        try {
          const result = await SubmissionsAPI.claim(sub.taskId!, sub.courseId!, sub.moduleId!);
          totalXP += result.xpGained || 0;
          totalGold += result.goldGained || 0;
          if (result.leveledUp) {
            leveledUp = true;
            newLevel = result.newLevel;
          }
          taskTitles.push(sub.taskTitle || "Task");
        } catch (err) {
          console.error(`Failed to claim ${sub.taskTitle}`, err);
        }
      }
      
      // Show combined reward modal
      setRewardModal({
        open: true,
        xp: totalXP,
        gold: totalGold,
        leveledUp,
        newLevel,
        taskTitles
      });
      
      // Reload submissions
      await loadSubmissions();
    } catch (err) {
      console.error("Failed to claim rewards", err);
      alert("Failed to claim some rewards. Please try again.");
    } finally {
      setClaimingAll(false);
    }
  }

  const filteredSubmissions = submissions.filter((sub) => {
    if (filter === "all") return true;
    return sub.status === filter;
  });

  const statusConfig = {
    pending: {
      color: "text-amber-600",
      bg: "bg-amber-100",
      icon: <Clock className="w-4 h-4" />,
      label: "Pending Review",
    },
    approved: {
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      icon: <CheckCircle className="w-4 h-4" />,
      label: "Approved",
    },
    rejected: {
      color: "text-rose-600",
      bg: "bg-rose-100",
      icon: <XCircle className="w-4 h-4" />,
      label: "Needs Revision",
    },
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
      <main className="p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
            <div>
              <h2 className={`text-3xl font-bold ${theme.text} flex items-center gap-3`}>
                <FileCheck size={32} style={{ color: accentColor }} />
                My Submissions
              </h2>
              <p className={`${theme.textMuted} mt-2`}>Track your submitted tasks and feedback</p>
            </div>
            
            {/* Claim All Button */}
            {submissions.filter(s => s.status === "approved" && !s.claimedAt).length > 0 && (
              <button
                onClick={handleClaimAllRewards}
                disabled={claimingAll}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                style={{ backgroundColor: accentColor }}
              >
                {claimingAll ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Claiming All...
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5" />
                    Claim All Rewards ({submissions.filter(s => s.status === "approved" && !s.claimedAt).length})
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "pending", "approved", "rejected"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === status
                  ? ""
                  : `${theme.textMuted} hover:opacity-80`
              }`}
              style={
                filter === status
                  ? {
                      backgroundColor: darkMode ? `${accentColor}20` : `${accentColor}10`,
                      color: accentColor,
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderColor: darkMode ? `${accentColor}50` : `${accentColor}30`,
                    }
                  : {}
              }
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: accentColor }} />
            <span className={theme.textMuted}>Loading submissions...</span>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div
            className={`${theme.card} rounded-2xl p-12 text-center`}
            style={{ ...theme.borderStyle, borderWidth: "1px", borderStyle: "solid" }}
          >
            <FileCheck size={48} className="mx-auto mb-4 opacity-50" style={{ color: accentColor }} />
            <p className={`${theme.text} font-medium mb-2`}>No submissions found</p>
            <p className={`${theme.textMuted} text-sm`}>
              {filter === "all"
                ? "Submit your first task to see it here!"
                : `No ${filter} submissions yet.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map((sub) => {
              const config = statusConfig[sub.status];
              return (
                <div
                  key={sub.submissionId}
                  className={`${theme.card} rounded-2xl p-6`}
                  style={{ ...theme.borderStyle, borderWidth: "1px", borderStyle: "solid" }}
                >
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className={`text-lg font-bold ${theme.text} mb-1`}>
                        {sub.taskTitle || "Task"}
                      </h3>
                      <p className={`${theme.textMuted} text-sm`}>
                        {sub.courseName} • {sub.moduleName}
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg} ${config.color}`}>
                      {config.icon}
                      <span className="text-xs font-semibold">{config.label}</span>
                    </div>
                  </div>

                  <div className={`text-sm ${theme.textMuted} mb-4`}>
                    Submitted: {new Date(sub.createdAt).toLocaleString()}
                  </div>

                  {sub.imageUrl && (
                    <div className="mb-4">
                      <button
                        onClick={() => setImageModal({ open: true, url: sub.imageUrl! })}
                        className="inline-flex items-center gap-2 text-sm hover:underline"
                        style={{ color: accentColor }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Evidence
                      </button>
                    </div>
                  )}

                  {sub.teacherComment && sub.status === "rejected" && (
                    <div className="mt-4 p-4 rounded-lg bg-rose-50 border border-rose-200">
                      <p className="text-sm font-semibold text-rose-900 mb-1">Teacher Feedback:</p>
                      <p className="text-sm text-rose-800">{sub.teacherComment}</p>
                      
                      {/* Resubmit Button */}
                      <div className="mt-3">
                        <input
                          type="file"
                          ref={(el) => { fileInputRefs.current[sub.submissionId] = el; }}
                          onChange={(e) => handleFileSelect(sub, e)}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRefs.current[sub.submissionId]?.click()}
                          disabled={resubmitting === sub.submissionId}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: accentColor }}
                        >
                          {resubmitting === sub.submissionId ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Resubmit
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {sub.status === "approved" && !sub.claimedAt && (
                    <div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                      <p className="text-sm text-emerald-800 mb-3">
                        ✓ Approved! Your rewards are ready.
                      </p>
                      <button
                        onClick={() => handleClaimReward(sub)}
                        disabled={claiming === sub.submissionId}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700"
                      >
                        {claiming === sub.submissionId ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Claiming...
                          </>
                        ) : (
                          <>
                            <Gift className="w-4 h-4" />
                            Claim Rewards
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {sub.claimedAt && (
                    <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-800">
                        ✓ Rewards claimed on {new Date(sub.claimedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Reward Modal */}
      {rewardModal?.open && (
        <Modal 
          title="Rewards Claimed!" 
          onClose={() => setRewardModal(null)}
          showClose={true}
        >
          <div className="text-center py-6">
            <div className="mb-6">
              <Gift className="w-16 h-16 mx-auto mb-4" style={{ color: accentColor }} />
              <h3 className={`text-2xl font-bold ${theme.text} mb-2`}>Congratulations!</h3>
              <p className={`${theme.textMuted}`}>You've earned your rewards</p>
            </div>
            
            {/* Task Titles */}
            {rewardModal.taskTitles && rewardModal.taskTitles.length > 0 && (
              <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: darkMode ? 'rgba(100, 100, 100, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}>
                <p className={`text-sm font-semibold ${theme.textMuted} mb-2`}>
                  {rewardModal.taskTitles.length === 1 ? 'Completed Task:' : `Completed ${rewardModal.taskTitles.length} Tasks:`}
                </p>
                <div className="space-y-1">
                  {rewardModal.taskTitles.map((title, idx) => (
                    <p key={idx} className={`text-sm ${theme.text}`}>✓ {title}</p>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 p-4 rounded-xl" style={{ backgroundColor: darkMode ? 'rgba(147, 51, 234, 0.1)' : 'rgba(147, 51, 234, 0.05)' }}>
                <div className="text-3xl">⚡</div>
                <div>
                  <div className={`text-sm ${theme.textMuted}`}>XP Gained</div>
                  <div className="text-2xl font-bold" style={{ color: accentColor }}>+{rewardModal.xp}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-3 p-4 rounded-xl" style={{ backgroundColor: darkMode ? 'rgba(234, 179, 8, 0.1)' : 'rgba(234, 179, 8, 0.05)' }}>
                <Coins className="w-8 h-8 text-yellow-600" />
                <div>
                  <div className={`text-sm ${theme.textMuted}`}>Gold Earned</div>
                  <div className="text-2xl font-bold text-yellow-600">+{rewardModal.gold}</div>
                </div>
              </div>
            </div>

            {rewardModal.leveledUp && rewardModal.newLevel && (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <p className="text-lg font-bold">🎉 Level Up!</p>
                <p className="text-2xl font-bold">Level {rewardModal.newLevel}</p>
              </div>
            )}
            
            <button
              onClick={() => setRewardModal(null)}
              className="mt-6 px-6 py-2 rounded-lg text-white font-medium transition-all"
              style={{ backgroundColor: accentColor }}
            >
              Awesome!
            </button>
          </div>
        </Modal>
      )}

      {rewardModal?.leveledUp && rewardModal.newLevel && (
        <LevelUpAnimation 
          oldLevel={(rewardModal.newLevel || 1) - 1} 
          newLevel={rewardModal.newLevel} 
          reward={{ gold: rewardModal.gold }}
          accentColor={accentColor}
        />
      )}

      {/* Image Modal */}
      {imageModal.open && (
        <Modal title="Submission Evidence" onClose={() => setImageModal({ open: false, url: "" })} showClose={true}>
          <div className="max-h-[70vh] overflow-auto">
            <img
              src={imageModal.url}
              alt="Submission evidence"
              className="w-full h-auto rounded-lg"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
