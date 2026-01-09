import { useEffect, useState } from "react";
import { SubmissionsAPI, type Submission, type SubmissionStatus } from "@/api/submissions.api";
import { useAuth } from "@/context/AuthContext";
import { BadgeCheck, Ban, Loader2, X } from "lucide-react";
import { Modal } from "@/components/Modal";

const statusColors: Record<SubmissionStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

export default function TeacherSubmissionsPage() {
  const { firebaseUser } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"" | SubmissionStatus>("pending");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState("");
  const [imageModal, setImageModal] = useState<{ open: boolean; url: string }>({ open: false, url: "" });

  useEffect(() => {
    void loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function loadSubmissions() {
    if (!firebaseUser) return;
    try {
      setLoading(true);
      const data = await SubmissionsAPI.listForTeacher(statusFilter || undefined);
      setSubmissions(data);
    } catch (err) {
      console.error("Failed to load submissions", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(sub: Submission, status: "approved" | "rejected") {
    if (status === "rejected") {
      setRejectModal(sub);
      setFeedback("");
      return;
    }
    if (!sub.taskId || !sub.courseId || !sub.moduleId) return;
    try {
      setActioningId(sub.submissionId);
      await SubmissionsAPI.update(
        sub.taskId,
        sub.submissionId,
        sub.courseId,
        sub.moduleId,
        status,
        undefined
      );
      await loadSubmissions();
    } catch (err) {
      console.error("Failed to update submission", err);
    } finally {
      setActioningId(null);
    }
  }

  async function handleRejectWithFeedback() {
    if (!rejectModal || !rejectModal.taskId || !rejectModal.courseId || !rejectModal.moduleId) return;
    if (!feedback.trim()) {
      alert("Please provide feedback for the student.");
      return;
    }
    try {
      setActioningId(rejectModal.submissionId);
      await SubmissionsAPI.update(
        rejectModal.taskId,
        rejectModal.submissionId,
        rejectModal.courseId,
        rejectModal.moduleId,
        "rejected",
        feedback.trim()
      );
      setRejectModal(null);
      setFeedback("");
      await loadSubmissions();
    } catch (err) {
      console.error("Failed to reject submission", err);
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Submissions Review</h1>
          <p className="text-sm text-gray-500">All submissions for your courses</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | SubmissionStatus)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading submissions...
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-sm text-gray-500">No submissions found.</div>
      ) : (
        <div className="grid gap-3">
          {submissions.map((sub) => (
            <div
              key={sub.submissionId}
              className="border rounded-lg p-3 bg-white shadow-sm"
            >
              <div className="flex flex-wrap justify-between gap-2 mb-2">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">
                    {sub.taskTitle || "Task"} · {sub.moduleName || "Module"} · {sub.courseName || "Course"}
                  </div>
                  <div className="text-xs text-gray-500">
                    Student: {(sub as any).studentName || sub.studentId} · {new Date(sub.createdAt).toLocaleString()}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${statusColors[sub.status] || "bg-gray-100 text-gray-700"}`}>
                  {sub.status}
                </span>
              </div>

              {sub.imageUrl && (
                <div className="mb-3">
                  <button
                    onClick={() => setImageModal({ open: true, url: sub.imageUrl! })}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View evidence
                  </button>
                </div>
              )}

              {sub.status === "pending" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actioningId === sub.submissionId}
                    onClick={() => handleAction(sub, "approved")}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <BadgeCheck className="w-4 h-4" /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={actioningId === sub.submissionId}
                    onClick={() => handleAction(sub, "rejected")}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    <Ban className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Feedback Modal */}
      {rejectModal && (
        <Modal
          title={`Reject: ${rejectModal.taskTitle}`}
          onClose={() => setRejectModal(null)}
          label="Provide Feedback"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Task: <span className="font-semibold">{rejectModal.taskTitle}</span>
              </p>
              <p className="text-sm text-gray-600">
                Student: <span className="font-semibold">{(rejectModal as any).studentName || rejectModal.studentId}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feedback for student <span className="text-red-600">*</span>
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explain what needs to be improved..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectWithFeedback}
                disabled={actioningId === rejectModal.submissionId || !feedback.trim()}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Ban className="w-4 h-4" /> Reject with Feedback
              </button>
            </div>
          </div>
        </Modal>
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
