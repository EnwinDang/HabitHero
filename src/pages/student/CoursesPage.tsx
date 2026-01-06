import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { CoursesAPI } from "@/api/courses.api";
import type { Course } from "@/models/course.model";
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
  const [enrolledCourses, setEnrolledCourses] = useState<Set<string>>(new Set());

  // Load courses and check enrollment status
  useEffect(() => {
    async function fetchCourses() {
      try {
        setLoading(true);
        const coursesData = await CoursesAPI.list(true);
        setCourses(coursesData);

        // Check which courses the user is enrolled in
        if (firebaseUser) {
          const enrolled = new Set<string>();
          for (const course of coursesData) {
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
        <div className="text-xl animate-pulse flex items-center gap-2" style={theme.accentText}>
          <Loader2 className="animate-spin" size={24} />
          Loading courses...
        </div>
      </div>
    );
  }

  const enrolledCoursesList = courses.filter((c) => enrolledCourses.has(c.courseId));
  const availableCoursesList = courses.filter((c) => !enrolledCourses.has(c.courseId));

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
      <main className="p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className={`text-4xl font-bold ${theme.text} flex items-center gap-3`}>
            <GraduationCap size={40} style={{ color: accentColor }} />
            My Courses
          </h2>
          <p style={theme.accentText} className="mt-2">
            Enroll in courses to start learning and earning XP
          </p>
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
                  onAction={() => handleUnenroll(course.courseId)}
                  darkMode={darkMode}
                  accentColor={accentColor}
                  theme={theme}
                />
              ))}
            </div>
          </div>
        )}

        {/* Available Courses */}
        {availableCoursesList.length > 0 && (
          <div>
            <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>
              Available Courses ({availableCoursesList.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableCoursesList.map((course) => (
                <CourseCard
                  key={course.courseId}
                  course={course}
                  isEnrolled={false}
                  isEnrolling={enrollingCourse === course.courseId}
                  onAction={() => handleEnroll(course.courseId)}
                  darkMode={darkMode}
                  accentColor={accentColor}
                  theme={theme}
                />
              ))}
            </div>
          </div>
        )}

        {/* No courses available */}
        {courses.length === 0 && (
          <div
            className={`${theme.card} rounded-2xl p-12 text-center`}
            style={{
              ...theme.borderStyle,
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            <BookOpen size={64} className="mx-auto mb-4" style={{ color: accentColor }} />
            <h3 className={`text-2xl font-bold ${theme.text} mb-2`}>
              No courses available yet
            </h3>
            <p className={theme.textSubtle}>
              Check back later for new courses to enroll in!
            </p>
          </div>
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
        <h4 className={`text-xl font-bold ${theme.text} mb-1`}>{course.name}</h4>
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
          <>
            Unenroll
          </>
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
