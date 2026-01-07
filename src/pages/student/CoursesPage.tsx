import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { CoursesAPI } from "@/api/courses.api";
import type { Course } from "@/models/course.model";
import { Modal } from "@/components/Modal";
import { db } from "@/firebase";
import { doc, setDoc, deleteDoc, updateDoc, deleteField } from "firebase/firestore";
import {
  BookOpen,
  Calendar,
  Plus,
  Check,
  Loader2,
  GraduationCap,
} from "lucide-react";

export default function CoursesPage() {
  const { firebaseUser } = useAuth();
  const { darkMode, accentColor } = useTheme();
  const theme = getThemeClasses(darkMode, accentColor);

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingCourse, setEnrollingCourse] = useState<string | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<Set<string>>(
    new Set()
  );
  const [confirmUnenroll, setConfirmUnenroll] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  // Smooth show/hide animation for toast
  useEffect(() => {
    if (!toast) return;
    setToastVisible(true);
    const hide = setTimeout(() => setToastVisible(false), 2200);
    const remove = setTimeout(() => setToast(null), 2600);
    return () => {
      clearTimeout(hide);
      clearTimeout(remove);
    };
  }, [toast]);

  // Load courses (including inactive) and check enrollment status
  useEffect(() => {
    async function fetchCourses() {
      try {
        setLoading(true);
        // Include inactive/upcoming courses so already-enrolled ones always show
        const coursesData = await CoursesAPI.list(false);
        setCourses(coursesData);

        // Check which courses the user is enrolled in
        if (firebaseUser) {
          const enrolled = new Set<string>();
          // Prefer the students map on the course doc; fall back to student collection if absent
          for (const course of coursesData) {
            const mapHasUser = course.students && Boolean(course.students[firebaseUser.uid]);
            if (mapHasUser) {
              enrolled.add(course.courseId);
              continue;
            }
            try {
              const students = await CoursesAPI.listStudents(course.courseId);
              if (students.some((s) => s.uid === firebaseUser.uid)) {
                enrolled.add(course.courseId);
              }
            } catch (err) {
              console.error(`Error checking enrollment for ${course.courseId}:`, err);
            }
          }
          setEnrolledCourses(enrolled);
        }
      } catch (error) {
        console.error("Error loading courses:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, [firebaseUser]);

  async function handleEnroll(courseId: string) {
    if (!firebaseUser) return;

    try {
      setEnrollingCourse(courseId);
      await CoursesAPI.enroll(courseId, {
        uid: firebaseUser.uid,
        enrolledAt: Date.now(),
      });

      // Mirror enrollment in Firestore under the course's students subcollection
      const studentRef = doc(db, `courses/${courseId}/students/${firebaseUser.uid}`);
      await setDoc(studentRef, {
        uid: firebaseUser.uid,
        enrolledAt: Date.now(),
      });

      // Also mark enrollment on the course document's students map for quick lookups
      const courseRef = doc(db, `courses/${courseId}`);
      await updateDoc(courseRef, {
        [`students.${firebaseUser.uid}`]: true,
      });

      // Update enrolled courses
      setEnrolledCourses((prev) => new Set(prev).add(courseId));
    } catch (error) {
      console.error("Error enrolling in course:", error);
      alert("Error al inscribirse en el curso. Por favor intenta de nuevo.");
    } finally {
      setEnrollingCourse(null);
    }
  }

  async function handleUnenroll(courseId: string) {
    if (!firebaseUser) return;

    try {
      setEnrollingCourse(courseId);
      await CoursesAPI.unenroll(courseId, firebaseUser.uid);

      // Update enrolled courses
      setEnrolledCourses((prev) => {
        const newSet = new Set(prev);
        newSet.delete(courseId);
        return newSet;
      });

      // Remove enrollment mirror from Firestore for consistency
      const studentRef = doc(db, `courses/${courseId}/students/${firebaseUser.uid}`);
      await deleteDoc(studentRef);

      // Remove the student flag from the course document's students map
      const courseRef = doc(db, `courses/${courseId}`);
      await updateDoc(courseRef, {
        [`students.${firebaseUser.uid}`]: deleteField(),
      });
    } catch (error) {
      console.error("Error unenrolling from course:", error);
      alert("Error al desinscribirse del curso. Por favor intenta de nuevo.");
    } finally {
      setEnrollingCourse(null);
    }
  }

  if (loading) {
    return (
      <div
        className={`min-h-screen ${theme.bg} flex items-center justify-center transition-colors duration-300`}
      >
        <div
          className="text-xl animate-pulse flex items-center gap-2"
          style={theme.accentText}
        >
          <Loader2 className="animate-spin" size={24} />
          Loading courses...
        </div>
      </div>
    );
  }

  const enrolledCoursesList = courses.filter((c) =>
    enrolledCourses.has(c.courseId)
  );
  const availableCoursesList = courses.filter(
    (c) => !enrolledCourses.has(c.courseId)
  );

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
      <main className="p-8 overflow-y-auto">
        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 pointer-events-none" aria-live="polite" role="status">
            <div
              className={`px-4 py-2 rounded-xl shadow-md text-sm font-medium transition-all duration-300 transform ${toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
              style={{
                backgroundColor: toast.type === "success" ? accentColor : (darkMode ? "#7f1d1d" : "#fee2e2"),
                color: toast.type === "success" ? "#ffffff" : (darkMode ? "#fecaca" : "#991b1b"),
              }}
            >
              {toast.message}
            </div>
          </div>
        )}
        {/* Header */}
        <div className="mb-8">
          <h2
            className={`text-4xl font-bold ${theme.text} flex items-center gap-3`}
          >
            <GraduationCap size={40} style={{ color: accentColor }} />
            My Courses
          </h2>
          <p style={theme.accentText} className="mt-2">
            Only your enrolled courses are shown here
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => { setAddOpen(true); setJoinCode(""); setJoinError(null); }}
              className="px-4 py-2 rounded-xl font-semibold flex items-center gap-2 text-white"
              style={{ background: accentColor }}
            >
              <Plus size={16} /> Add Course
            </button>
          </div>
        </div>

        {/* Enrolled Courses */}
        {enrolledCoursesList.length > 0 && (
          <div className="mb-8">
            <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>
              Enrolled Courses ({enrolledCoursesList.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCoursesList.map((course) => (
                <CourseCard
                  key={course.courseId}
                  course={course}
                  isEnrolled={true}
                  isEnrolling={enrollingCourse === course.courseId}
                  onAction={() => setConfirmUnenroll({ id: course.courseId, name: course.name })}
                  darkMode={darkMode}
                  accentColor={accentColor}
                  theme={theme}
                />
              ))}
            </div>
          </div>
        )}

        {/* Available Courses hidden intentionally */}

        {/* No enrolled courses */}
        {enrolledCoursesList.length === 0 && (
          <div
            className={`${theme.card} rounded-2xl p-12 text-center`}
            style={{
              ...theme.borderStyle,
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            <BookOpen
              size={64}
              className="mx-auto mb-4"
              style={{ color: accentColor }}
            />
            <h3 className={`text-2xl font-bold ${theme.text} mb-2`}>
              No enrolled courses yet
            </h3>
            <p className={theme.textSubtle}>
              Ask your teacher for a course code to enroll.
            </p>
          </div>
        )}

        {/* Confirm Unenroll Modal */}
        {confirmUnenroll && (
          <Modal
            label="Confirm"
            title="Unenroll from course?"
            onClose={() => setConfirmUnenroll(null)}
            showClose={false}
          >
            <div className="space-y-6">
              <p className={theme.text}>
                Are you sure you want to unenroll from <span className="font-semibold">{confirmUnenroll.name}</span>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className={`px-4 py-2 rounded-xl ${theme.card}`}
                  style={{ ...theme.borderStyle, borderWidth: "1px", borderStyle: "solid" }}
                  onClick={() => setConfirmUnenroll(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={enrollingCourse === confirmUnenroll.id}
                  className="px-4 py-2 rounded-xl font-semibold"
                  style={{
                    backgroundColor: darkMode ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    opacity: enrollingCourse === confirmUnenroll.id ? 0.6 : 1,
                    cursor: enrollingCourse === confirmUnenroll.id ? "not-allowed" : "pointer",
                  }}
                  onClick={async () => {
                    try {
                      await handleUnenroll(confirmUnenroll.id);
                      setToast({ message: `Unenrolled from ${confirmUnenroll.name}`, type: "success" });
                      setConfirmUnenroll(null);
                    } catch (e) {
                      setToast({ message: "Failed to unenroll. Please try again.", type: "error" });
                    }
                  }}
                >
                  {enrollingCourse === confirmUnenroll.id ? "Processing..." : "Unenroll"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Add Course by Code Modal */}
        {addOpen && (
          <Modal
            label="Add Course"
            title="Join a course with a code"
            onClose={() => { if (!joinLoading) { setAddOpen(false); } }}
            showClose={false}
          >
            <div className="space-y-6">
              <div>
                <label className={`text-sm ${theme.textMuted} block mb-1`}>Course code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.currentTarget.value); setJoinError(null); }}
                  placeholder="e.g. PE1"
                  className={`w-full p-2 rounded-lg ${theme.text} ${theme.card}`}
                  style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}
                />
                {joinError && <p className="mt-2 text-sm text-rose-500">{joinError}</p>}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className={`px-4 py-2 rounded-xl ${theme.card}`}
                  style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}
                  onClick={() => setAddOpen(false)}
                  disabled={joinLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl font-semibold text-white"
                  style={{ background: accentColor, opacity: joinLoading ? 0.7 : 1 }}
                  disabled={joinLoading || !joinCode.trim() || !firebaseUser}
                  onClick={async () => {
                    if (!firebaseUser) return;
                    const code = joinCode.trim();
                    if (!code) return;
                    setJoinLoading(true);
                    setJoinError(null);
                    try {
                      // Refresh courses (include inactive/upcoming) to ensure the code exists
                      const list = await CoursesAPI.list(false);
                      setCourses(list);
                      const normalize = (s: string) => (s || "").replace(/\s+/g, "").toLowerCase();
                      const codeNorm = normalize(code);
                      const match = list.find(c => normalize(c.courseCode || "") === codeNorm);
                      if (!match) {
                        setJoinError('Invalid or unknown course code. Please enter the exact course code.');
                        return;
                      }
                      if (enrolledCourses.has(match.courseId)) {
                        setJoinError('You are already enrolled in this course.');
                        return;
                      }
                      setEnrollingCourse(match.courseId);
                      await CoursesAPI.enroll(match.courseId, { uid: firebaseUser.uid, enrolledAt: Date.now() });
                      // Mirror enrollment in Firestore under the course's students subcollection
                      const studentRef = doc(db, `courses/${match.courseId}/students/${firebaseUser.uid}`);
                      await setDoc(studentRef, { uid: firebaseUser.uid, enrolledAt: Date.now() });

                      // Also mark enrollment on the course document's students map for quick lookups
                      const courseRef = doc(db, `courses/${match.courseId}`);
                      await updateDoc(courseRef, {
                        [`students.${firebaseUser.uid}`]: true,
                      });
                      setEnrolledCourses(prev => new Set(prev).add(match.courseId));
                      setAddOpen(false);
                      setToast({ message: `Joined course ${match.courseCode}`, type: "success" });
                    } catch (err) {
                      console.error('Join by code failed:', err);
                      setJoinError('Could not join the course. Please try again.');
                      setToast({ message: 'Could not join the course. Please try again.', type: 'error' });
                    } finally {
                      setEnrollingCourse(null);
                      setJoinLoading(false);
                    }
                  }}
                >
                  {joinLoading ? 'Adding…' : 'Add Course'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}

/* Course Card Component */
function CourseCard({
  course,
  isEnrolled,
  isEnrolling,
  onAction,
  darkMode,
  accentColor,
  theme,
}: {
  course: Course;
  isEnrolled: boolean;
  isEnrolling: boolean;
  onAction: () => void;
  darkMode: boolean;
  accentColor: string;
  theme: ReturnType<typeof getThemeClasses>;
}) {
  return (
    <div
      className={`${theme.card} rounded-2xl p-6 transition-all duration-300 hover:scale-105`}
      style={{
        ...theme.borderStyle,
        borderWidth: "1px",
        borderStyle: "solid",
        boxShadow: isEnrolled ? `0 0 20px ${accentColor}30` : "none",
      }}
    >
      {/* Course Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: `${accentColor}20`,
            }}
          >
            <BookOpen size={24} style={{ color: accentColor }} />
          </div>
          {isEnrolled && (
            <div
              className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
              style={{
                backgroundColor: `${accentColor}20`,
                color: accentColor,
              }}
            >
              <Check size={14} />
              Enrolled
            </div>
          )}
        </div>
        <h4 className={`text-xl font-bold ${theme.text} mb-1`}>
          {course.name}
        </h4>
        <p className={`text-sm ${theme.textSubtle}`}>{course.courseCode}</p>
      </div>

      {/* Course Description */}
      {course.description && (
        <p className={`${theme.textMuted} text-sm mb-4 line-clamp-3`}>
          {course.description}
        </p>
      )}

      {/* Course Info */}
      <div className="space-y-2 mb-4">
        {course.startDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={16} className={theme.textSubtle} />
            <span className={theme.textMuted}>
              Start: {new Date(course.startDate).toLocaleDateString()}
            </span>
          </div>
        )}
        {course.endDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={16} className={theme.textSubtle} />
            <span className={theme.textMuted}>
              End: {new Date(course.endDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={onAction}
        disabled={isEnrolling}
        className="w-full py-2 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
        style={{
          backgroundColor: isEnrolled
            ? darkMode
              ? "rgba(239, 68, 68, 0.2)"
              : "rgba(239, 68, 68, 0.1)"
            : accentColor,
          color: isEnrolled ? "#ef4444" : "white",
          opacity: isEnrolling ? 0.6 : 1,
          cursor: isEnrolling ? "not-allowed" : "pointer",
        }}
      >
        {isEnrolling ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            Processing...
          </>
        ) : isEnrolled ? (
          <>Unenroll</>
        ) : (
          <>
            <Plus size={16} />
            Enroll Now
          </>
        )}
      </button>
    </div>
  );
}
