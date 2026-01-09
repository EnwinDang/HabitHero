import { useEffect, useState } from "react";
import { SubmissionsAPI, type Submission, type SubmissionStatus } from "@/api/submissions.api";
import { useAuth } from "@/context/AuthContext";
import { BadgeCheck, Ban, Loader2 } from "lucide-react";

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
    if (!sub.taskId || !sub.courseId || !sub.moduleId) return;
    try {
      setActioningId(sub.submissionId);
      await SubmissionsAPI.update(
        sub.taskId,
        sub.submissionId,
        sub.courseId,
        sub.moduleId,
        status,
        status === "rejected" ? "Please re-submit." : undefined
      );
      await loadSubmissions();
    } catch (err) {
      console.error("Failed to update submission", err);
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
            onChange={(e) => setStatusFilter(e.target.value)}
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
                    Student: {sub.studentId} · {new Date(sub.createdAt).toLocaleString()}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${statusColors[sub.status] || "bg-gray-100 text-gray-700"}`}>
                  {sub.status}
                </span>
              </div>

              {sub.imageUrl && (
                <div className="mb-3">
                  <a
                    href={sub.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View evidence
                  </a>
                </div>
              )}

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
