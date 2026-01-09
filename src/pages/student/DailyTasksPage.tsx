import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useAuth } from "@/context/AuthContext";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { TasksAPI } from "@/api/tasks.api";
import { CoursesAPI } from "@/api/courses.api";
import { SubmissionsAPI, type Submission } from "@/api/submissions.api";
import { Modal } from "@/components/Modal";
import { db, storage } from "@/firebase";
import { collection, query, where, getDocs, doc, setDoc, getDoc, deleteDoc, updateDoc, deleteField } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Task } from "@/models/task.model";
import type { Course } from "@/models/course.model";
import type { Module } from "@/models/module.model";
import {
    ClipboardList,
    BookOpen,
    Coins,
    Star,
    Check,
    Plus,
    ChevronDown,
    GraduationCap,
    Key,
    Layers,
    X,
    LogOut,
    ArrowUpDown,
    Calendar,
    Link as LinkIcon,
    Upload,
    Image as ImageIcon,
} from "lucide-react";

export default function DailyTasksPage() {
    const { courseId: courseIdParam } = useParams<{ courseId?: string }>();
    const navigate = useNavigate();
    const { user, loading: userLoading } = useRealtimeUser();
    const { firebaseUser } = useAuth();
    const { darkMode, accentColor } = useTheme();
    const theme = getThemeClasses(darkMode, accentColor);

    const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
    const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
    const [showCourseDropdown, setShowCourseDropdown] = useState(false);
    const [enrollingCourse, setEnrollingCourse] = useState<string | null>(null);
    const [showCodeInput, setShowCodeInput] = useState(false);
    const [courseCode, setCourseCode] = useState("");
    const [codeError, setCodeError] = useState("");
    const [courseSearchQuery, setCourseSearchQuery] = useState("");
    const [moduleSortOrder, setModuleSortOrder] = useState<"order" | "a-z" | "z-a">("a-z");
    const [confirmLeave, setConfirmLeave] = useState<{ id: string; name: string } | null>(null);
    const [leavingCourse, setLeavingCourse] = useState(false);
    const [submissionModal, setSubmissionModal] = useState<Task | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [submissions, setSubmissions] = useState<Record<string, Submission>>({});

    useEffect(() => {
        loadCoursesAndTasks();
    }, [firebaseUser, courseIdParam]);

    async function loadCoursesAndTasks() {
        if (!firebaseUser) return;
        
        try {
            setLoading(true);
            
            // Only load enrolled courses by checking where student is enrolled
            const enrolled: Course[] = [];
            const coursesSnapshot = await getDocs(collection(db, "courses"));
            
            // Use Promise.all to check enrollments in parallel instead of sequentially
            const enrollmentChecks = coursesSnapshot.docs.map(async (courseDoc) => {
                const studentDoc = await getDoc(doc(db, `courses/${courseDoc.id}/students/${firebaseUser.uid}`));
                
                if (studentDoc.exists()) {
                    return {
                        courseId: courseDoc.id,
                        ...courseDoc.data()
                    } as Course;
                }
                return null;
            });
            
            const results = await Promise.all(enrollmentChecks);
            const enrolledCourses = results.filter((course): course is Course => course !== null);
            
            setEnrolledCourses(enrolledCourses);
            setAvailableCourses([]); // No courses shown as "available" - only via code
            
            // If a courseId is provided via URL, prefer it
            if (enrolledCourses.length > 0) {
                const byParam = courseIdParam
                    ? enrolledCourses.find(c => c.courseId === courseIdParam)
                    : null;
                await selectCourse(byParam || enrolledCourses[0]);
            } else {
                // No courses enrolled; if a courseId is in URL, send back to list
                if (courseIdParam) {
                    navigate('/student/courses');
                }
            }
        } catch (error) {
            console.error("Error loading courses:", error);
        } finally {
            setLoading(false);
        }
    }

    async function selectCourse(course: Course) {
        setSelectedCourse(course);
        setShowCourseDropdown(false);
        
        try {
            // Load modules for the course
            const courseModules = await CoursesAPI.listModules(course.courseId);
            setModules(courseModules);

            // Select first module by default based on current sort order
            if (courseModules.length > 0) {
                const initialModules = [...courseModules];
                let firstModule = initialModules[0];
                if (moduleSortOrder === "a-z") {
                    firstModule = initialModules.sort((a, b) => a.title.localeCompare(b.title))[0];
                } else if (moduleSortOrder === "z-a") {
                    firstModule = initialModules.sort((a, b) => b.title.localeCompare(a.title))[0];
                } else {
                    firstModule = initialModules.sort((a, b) => a.order - b.order)[0];
                }
                await selectModule(firstModule, course.courseId);
            } else {
                // No modules, no tasks to show
                setTasks([]);
                setSelectedModule(null);
            }
        } catch (error) {
            console.error("Error loading modules:", error);
            setModules([]);
            setTasks([]);
        }
    }

    async function selectModule(module: Module, courseId?: string) {
        setSelectedModule(module);
        
        try {
            const cid = courseId || selectedCourse?.courseId;
            if (!cid) {
                console.error('No courseId available');
                setTasks([]);
                return;
            }
            
            // Load tasks from module-scoped collection: courses/{courseId}/modules/{moduleId}/tasks
            const tasksRef = collection(db, `courses/${cid}/modules/${module.moduleId}/tasks`);
            const snapshot = await getDocs(tasksRef);
            const moduleTasks = snapshot.docs.map(doc => ({
                taskId: doc.id,
                ...doc.data()
            })) as Task[];
            
            console.log('Loaded tasks for module:', module.title, moduleTasks);
            setTasks(moduleTasks);

            // Load submissions for these tasks
            if (firebaseUser && moduleTasks.length > 0) {
                const submissionsMap: Record<string, Submission> = {};
                await Promise.all(
                    moduleTasks.map(async (task) => {
                        try {
                            const subs = await SubmissionsAPI.list(task.taskId, cid, module.moduleId);
                            if (subs.length > 0) {
                                submissionsMap[task.taskId] = subs[0]; // Latest submission
                            }
                        } catch (err) {
                            console.error(`Error loading submissions for task ${task.taskId}:`, err);
                        }
                    })
                );
                setSubmissions(submissionsMap);
            }
        } catch (error) {
            console.error("Error loading module tasks:", error);
            setTasks([]);
        }
    }

    async function handleEnrollCourse(course: Course) {
        if (!firebaseUser) return;

        try {
            setEnrollingCourse(course.courseId);
            await CoursesAPI.enroll(course.courseId, {
                uid: firebaseUser.uid,
                enrolledAt: Date.now(),
            });

            // Move course from available to enrolled
            setAvailableCourses(availableCourses.filter(c => c.courseId !== course.courseId));
            setEnrolledCourses([...enrolledCourses, course]);
            
            // Auto-select the newly enrolled course
            await selectCourse(course);
        } catch (error) {
            console.error("Error enrolling in course:", error);
            alert("Error al inscribirse en el curso. Por favor intenta de nuevo.");
        } finally {
            setEnrollingCourse(null);
        }
    }

    async function handleEnrollWithCode() {
        if (!firebaseUser || !courseCode.trim()) {
            setCodeError("Please enter a course code");
            return;
        }

        try {
            setEnrollingCourse("code-enrollment");
            setCodeError("");

            // Find course by courseCode (exact match) from Firestore
            const coursesSnapshot = await getDocs(collection(db, "courses"));
            const foundCourse = coursesSnapshot.docs
                .map(doc => ({
                    courseId: doc.id,
                    ...doc.data()
                } as Course))
                .find(c => c.courseCode === courseCode.trim());

            if (!foundCourse) {
                setCodeError("Invalid course code. Please check and try again.");
                setEnrollingCourse(null);
                return;
            }

            // Check if already enrolled by checking Firestore directly
            const studentDoc = await getDoc(doc(db, `courses/${foundCourse.courseId}/students/${firebaseUser.uid}`));
            if (studentDoc.exists()) {
                setCodeError("You are already enrolled in this course.");
                setEnrollingCourse(null);
                return;
            }

            // Enroll in the course directly in Firestore
            const studentRef = doc(db, `courses/${foundCourse.courseId}/students/${firebaseUser.uid}`);
            await setDoc(studentRef, {
                uid: firebaseUser.uid,
                enrolledAt: Date.now(),
            });

            console.log("✅ Enrolled in course:", foundCourse.name);

            // Update state
            setEnrolledCourses([...enrolledCourses, foundCourse]);
            
            // Select the newly enrolled course
            await selectCourse(foundCourse);
            
            // Close modal and reset
            setShowCodeInput(false);
            setCourseCode("");
            setCodeError("");
        } catch (error) {
            console.error("Error enrolling with code:", error);
            setCodeError("Error enrolling in course. Please try again.");
        } finally {
            setEnrollingCourse(null);
        }
    }

    async function handleLeaveCourse() {
        if (!firebaseUser || !selectedCourse) return;
        setConfirmLeave({ id: selectedCourse.courseId, name: selectedCourse.name });
    }

    async function confirmLeaveCourse() {
        if (!firebaseUser || !confirmLeave) return;

        try {
            setLeavingCourse(true);
            // Call API unenroll
            await CoursesAPI.unenroll(confirmLeave.id, firebaseUser.uid);

            // Delete student document from Firestore
            const studentRef = doc(db, `courses/${confirmLeave.id}/students/${firebaseUser.uid}`);
            await deleteDoc(studentRef);

            // Remove the student flag from the course document's students map
            const courseRef = doc(db, `courses/${confirmLeave.id}`);
            await updateDoc(courseRef, {
                [`students.${firebaseUser.uid}`]: deleteField(),
            });

            console.log("✅ Left course:", confirmLeave.name);

            // Update state
            setEnrolledCourses(enrolledCourses.filter(c => c.courseId !== confirmLeave.id));
            setSelectedCourse(null);
            setModules([]);
            setTasks([]);
            setShowCourseDropdown(false);
            setConfirmLeave(null);

            // Select first remaining enrolled course if any
            const remainingCourses = enrolledCourses.filter(c => c.courseId !== confirmLeave.id);
            if (remainingCourses.length > 0) {
                await selectCourse(remainingCourses[0]);
            }
        } catch (error) {
            console.error("Error leaving course:", error);
            alert("Error leaving course. Please try again.");
        } finally {
            setLeavingCourse(false);
        }
    }

    async function handleCompleteTask(task: Task) {
        // Open submission modal instead of directly completing
        setSubmissionModal(task);
        setImageFile(null);
        setImagePreview(null);
    }

    async function handleSubmitEvidence() {
        if (!submissionModal || !imageFile || !selectedCourse || !selectedModule || !firebaseUser) return;

        try {
            setUploadingImage(true);

            // Upload image to Firebase Storage
            const timestamp = Date.now();
            const storageRef = ref(
                storage,
                `submissions/${selectedCourse.courseId}/${selectedModule.moduleId}/${submissionModal.taskId}/${firebaseUser.uid}/${timestamp}.jpg`
            );
            await uploadBytes(storageRef, imageFile);
            const imageUrl = await getDownloadURL(storageRef);

            // Create submission
            const submission = await SubmissionsAPI.create(
                submissionModal.taskId,
                selectedCourse.courseId,
                selectedModule.moduleId,
                imageUrl
            );

            // Update local state
            setSubmissions(prev => ({ ...prev, [submissionModal.taskId]: submission }));
            
            setSubmissionModal(null);
            alert("Evidence submitted! Waiting for teacher approval.");
        } catch (error) {
            console.error("Error submitting evidence:", error);
            alert("Error submitting evidence. Please try again.");
        } finally {
            setUploadingImage(false);
        }
    }

    async function handleClaimReward(task: Task) {
        if (!selectedCourse || !selectedModule) return;

        try {
            const result = await SubmissionsAPI.claim(
                task.taskId,
                selectedCourse.courseId,
                selectedModule.moduleId
            );

            // Remove task from list
            setTasks(tasks.filter(t => t.taskId !== task.taskId));

            // Show reward notification
            const messages = [];
            if (result.reward?.xp) messages.push(`+${result.reward.xp} XP`);
            if (result.reward?.gold) messages.push(`+${result.reward.gold} Gold`);
            if (result.leveledUp) messages.push(`🎉 Level Up! Now level ${result.newLevel}`);

            if (messages.length > 0) {
                alert(messages.join('\n'));
            }

            // Refresh
            window.location.reload();
        } catch (error) {
            console.error("Error claiming reward:", error);
            alert("Error claiming reward. Please try again.");
        }
    }

    function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    }

    // Memoize filtered tasks to avoid recalculating on every render
    const filteredTasks = useMemo(() => {
        return selectedDifficulty === "all"
            ? tasks
            : tasks.filter(t => t.difficulty === selectedDifficulty);
    }, [tasks, selectedDifficulty]);

    const easyTasks = useMemo(() => tasks.filter(t => t.difficulty === "easy"), [tasks]);
    const mediumTasks = useMemo(() => tasks.filter(t => t.difficulty === "medium"), [tasks]);
    const hardTasks = useMemo(() => tasks.filter(t => t.difficulty === "hard"), [tasks]);
    const extremeTasks = useMemo(() => tasks.filter(t => t.difficulty === "extreme"), [tasks]);

    // Sort modules based on selected sort order
    const sortedModules = useMemo(() => {
        const modulesCopy = [...modules];
        switch (moduleSortOrder) {
            case "a-z":
                return modulesCopy.sort((a, b) => a.title.localeCompare(b.title));
            case "z-a":
                return modulesCopy.sort((a, b) => b.title.localeCompare(a.title));
            case "order":
            default:
                return modulesCopy.sort((a, b) => a.order - b.order);
        }
    }, [modules, moduleSortOrder]);

    if (userLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl animate-pulse" style={theme.accentText}>
                    Loading...
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
            <main className="p-8 overflow-y-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className={`text-3xl font-bold ${theme.text}`}>Courses Tasks</h2>
                        <p className={theme.textMuted}>Complete exercises to earn XP and Gold</p>
                    </div>
                    <div className="flex gap-2">
                        {selectedCourse && (
                            <button
                                onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                                className="px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2"
                                style={{
                                    backgroundColor: `${accentColor}20`,
                                    color: accentColor,
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: `${accentColor}50`
                                }}
                            >
                                <BookOpen size={18} />
                                Change Course
                            </button>
                        )}
                        <button
                            onClick={() => setShowCodeInput(true)}
                            className="px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 text-white"
                            style={{
                                backgroundColor: accentColor
                            }}
                        >
                            <Key size={18} />
                            Add Course
                        </button>
                        {selectedCourse && (
                            <button
                                onClick={handleLeaveCourse}
                                className="px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2"
                                style={{
                                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                    color: '#ef4444',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: 'rgba(239, 68, 68, 0.5)'
                                }}
                            >
                                <LogOut size={18} />
                                Leave Course
                            </button>
                        )}
                    </div>
                </div>

                {/* Course Selector */}
                <div className="mb-6">
                    {selectedCourse ? (
                        <div className="relative">
                            {/* Current Course Display */}
                            <div
                                className={`${theme.card} rounded-2xl p-6 transition-colors duration-300`}
                                style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: `${accentColor}20` }}
                                    >
                                        <BookOpen size={24} style={{ color: accentColor }} />
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-bold ${theme.text}`}>{selectedCourse.name}</h3>
                                        <p className={`text-sm ${theme.textMuted}`}>{selectedCourse.courseCode}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Dropdown Menu */}
                            {showCourseDropdown && (
                                <div
                                    className={`absolute top-full left-0 right-0 mt-2 ${theme.card} rounded-2xl shadow-xl z-10 overflow-hidden`}
                                    style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}
                                >
                                    {/* Search Input */}
                                    <div className="p-4 border-b" style={{ borderColor: `${accentColor}20` }}>
                                        <input
                                            type="text"
                                            value={courseSearchQuery}
                                            onChange={(e) => setCourseSearchQuery(e.target.value)}
                                            placeholder="Search courses..."
                                            className={`w-full px-4 py-2 rounded-xl ${theme.inputBg} ${theme.text} border transition-colors`}
                                            style={{
                                                borderColor: `${accentColor}30`,
                                                outline: 'none'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = accentColor}
                                            onBlur={(e) => e.target.style.borderColor = `${accentColor}30`}
                                            autoFocus
                                        />
                                    </div>

                                    {/* Enrolled Courses */}
                                    {enrolledCourses.filter(c => 
                                        c.name.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
                                        c.courseCode.toLowerCase().includes(courseSearchQuery.toLowerCase())
                                    ).length > 0 && (
                                        <div className="p-4">
                                            <p className={`text-xs font-bold uppercase tracking-wider ${theme.textSubtle} mb-2`}>
                                                My Courses
                                            </p>
                                            {enrolledCourses
                                                .filter(c => 
                                                    c.name.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
                                                    c.courseCode.toLowerCase().includes(courseSearchQuery.toLowerCase())
                                                )
                                                .map((course) => (
                                                <button
                                                    key={course.courseId}
                                                    onClick={() => selectCourse(course)}
                                                    className={`w-full p-3 rounded-lg text-left transition-colors mb-1 flex items-center gap-3 ${
                                                        selectedCourse.courseId === course.courseId
                                                            ? 'bg-opacity-20'
                                                            : 'hover:bg-opacity-10'
                                                    }`}
                                                    style={{
                                                        backgroundColor: selectedCourse.courseId === course.courseId
                                                            ? `${accentColor}20`
                                                            : darkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 0.5)'
                                                    }}
                                                >
                                                    <BookOpen size={18} style={{ color: accentColor }} />
                                                    <div className="flex-1">
                                                        <p className={`font-medium ${theme.text}`}>{course.name}</p>
                                                        <p className={`text-xs ${theme.textSubtle}`}>{course.courseCode}</p>
                                                    </div>
                                                    {selectedCourse.courseId === course.courseId && (
                                                        <Check size={18} style={{ color: accentColor }} />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Available Courses */}
                                    {availableCourses.length > 0 && (
                                        <div className={`p-4 ${enrolledCourses.length > 0 ? 'border-t' : ''}`} style={{ borderColor: `${accentColor}20` }}>
                                            <p className={`text-xs font-bold uppercase tracking-wider ${theme.textSubtle} mb-2`}>
                                                Available Courses
                                            </p>
                                            {availableCourses.map((course) => (
                                                <button
                                                    key={course.courseId}
                                                    onClick={() => handleEnrollCourse(course)}
                                                    disabled={enrollingCourse === course.courseId}
                                                    className={`w-full p-3 rounded-lg text-left transition-colors mb-1 flex items-center gap-3`}
                                                    style={{
                                                        backgroundColor: darkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 0.5)',
                                                        opacity: enrollingCourse === course.courseId ? 0.6 : 1,
                                                        cursor: enrollingCourse === course.courseId ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                        style={{ backgroundColor: `${accentColor}20` }}
                                                    >
                                                        <Plus size={16} style={{ color: accentColor }} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`font-medium ${theme.text}`}>{course.name}</p>
                                                        <p className={`text-xs ${theme.textSubtle}`}>{course.courseCode}</p>
                                                    </div>
                                                    {enrollingCourse === course.courseId && (
                                                        <span className={`text-xs ${theme.textMuted}`}>Enrolling...</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {enrolledCourses.length === 0 && availableCourses.length === 0 && (
                                        <div className="p-8 text-center">
                                            <GraduationCap size={40} className="mx-auto mb-2" style={{ color: accentColor }} />
                                            <p className={theme.textMuted}>No courses available</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : enrolledCourses.length === 0 ? (
                        <div className={`${theme.card} rounded-2xl p-8 text-center`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                            <GraduationCap size={48} className="mx-auto mb-4" style={{ color: accentColor }} />
                            <h3 className={`text-xl font-bold ${theme.text} mb-2`}>No Courses Enrolled</h3>
                            <p className={`${theme.textMuted} mb-4`}>Enter a course code from your teacher to get started!</p>
                            
                            <button
                                onClick={() => setShowCodeInput(true)}
                                className="px-6 py-3 rounded-xl font-bold transition-all text-white inline-flex items-center gap-2 mt-4"
                                style={{ backgroundColor: accentColor }}
                            >
                                <Key size={20} />
                                Enter Course Code
                            </button>
                        </div>
                    ) : null}
                </div>

                {/* Course Info */}
                {selectedCourse && selectedCourse.description && (
                    <div className={`${theme.card} rounded-xl p-4 mb-6`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                        <p className={theme.textMuted}>{selectedCourse.description}</p>
                    </div>
                )}

                {/* Modules */}
                {selectedCourse && modules.length > 0 && (
                    <div className="mb-6">
                        <h3 className={`text-lg font-bold ${theme.text} mb-3 flex items-center gap-2`}>
                            <Layers size={20} style={{ color: accentColor }} />
                            Modules
                        </h3>
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={() => setModuleSortOrder(prev => prev === "a-z" ? "z-a" : "a-z")}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all text-white flex items-center gap-1`}
                                style={{
                                    backgroundColor: accentColor
                                }}
                                aria-label="Toggle alphabetical sort"
                                title={moduleSortOrder === "a-z" ? "Sorted A-Z (click to switch to Z-A)" : "Sorted Z-A (click to switch to A-Z)"}
                            >
                                <ArrowUpDown size={14} />
                                {moduleSortOrder === "z-a" ? "Z-A" : "A-Z"}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {sortedModules.map((module) => (
                                <button
                                    key={module.moduleId}
                                    onClick={() => selectModule(module)}
                                    className={`${theme.card} rounded-xl p-4 text-left transition-all hover:scale-105`}
                                    style={{
                                        ...theme.borderStyle,
                                        borderWidth: '2px',
                                        borderStyle: 'solid',
                                        borderColor: selectedModule?.moduleId === module.moduleId ? accentColor : 'transparent',
                                        backgroundColor: selectedModule?.moduleId === module.moduleId 
                                            ? `${accentColor}10` 
                                            : undefined
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-bold ${theme.text} mb-1 truncate`}>
                                                {module.title}
                                            </h4>
                                            {module.description && (
                                                <p className={`text-xs ${theme.textSubtle} line-clamp-2`}>
                                                    {module.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Only show filters and tasks if a course is selected */}
                {selectedCourse && (
                    <>
                        {/* Module selection message */}
                        {modules.length > 0 && !selectedModule && (
                            <div className={`${theme.card} rounded-xl p-6 text-center mb-6`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                                <Layers size={40} className="mx-auto mb-3" style={{ color: accentColor }} />
                                <p className={`${theme.text} font-medium`}>Select a module above to view tasks</p>
                            </div>
                        )}

                        {/* Show filters and tasks only if module is selected or no modules exist */}
                        {(selectedModule || modules.length === 0) && (
                            <>
                                {/* Difficulty Filter */}
                                <div className="flex gap-2 mb-6 flex-wrap">
                            <button
                                onClick={() => setSelectedDifficulty("all")}
                                className={`px-4 py-2 rounded-xl font-medium transition-all ${selectedDifficulty === "all"
                                    ? `text-white`
                                    : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
                                    }`}
                                style={selectedDifficulty === "all" ? {
                                    backgroundColor: accentColor
                                } : {
                                    backgroundColor: darkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 1)'
                                }}
                            >
                                All ({tasks.length})
                            </button>
                            <DifficultyFilter
                                label="Easy"
                                count={easyTasks.length}
                                isSelected={selectedDifficulty === "easy"}
                                onClick={() => setSelectedDifficulty("easy")}
                                color="#22c55e"
                                darkMode={darkMode}
                            />
                            <DifficultyFilter
                                label="Medium"
                                count={mediumTasks.length}
                                isSelected={selectedDifficulty === "medium"}
                                onClick={() => setSelectedDifficulty("medium")}
                                color="#f59e0b"
                                darkMode={darkMode}
                            />
                            <DifficultyFilter
                                label="Hard"
                                count={hardTasks.length}
                                isSelected={selectedDifficulty === "hard"}
                                onClick={() => setSelectedDifficulty("hard")}
                                color="#ef4444"
                                darkMode={darkMode}
                            />
                            <DifficultyFilter
                                label="Extreme"
                                count={extremeTasks.length}
                                isSelected={selectedDifficulty === "extreme"}
                                onClick={() => setSelectedDifficulty("extreme")}
                                color={accentColor}
                                darkMode={darkMode}
                            />
                        </div>

                        {/* Tasks */}
                        {filteredTasks.length === 0 ? (
                            <div className={`${theme.card} rounded-xl text-center py-12`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                                <ClipboardList size={48} className={`mb-4 mx-auto`} style={{ color: accentColor, opacity: 0.5 }} />
                                <p className={`${theme.text} font-medium mb-2`}>No tasks available</p>
                                <p className={`${theme.textSubtle} text-sm`}>
                                    {selectedModule 
                                        ? `No tasks found in ${selectedModule.title}` 
                                        : 'No tasks found in this course'}
                                </p>
                                {selectedDifficulty !== "all" && (
                                    <p className={`${theme.textMuted} text-xs mt-2`}>
                                        Try selecting "All" difficulty
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {filteredTasks.map(task => (
                                    <TaskCard
                                        key={task.taskId}
                                        task={task}
                                        onComplete={handleCompleteTask}
                                        onClaim={handleClaimReward}
                                        submission={submissions[task.taskId]}
                                        darkMode={darkMode}
                                        accentColor={accentColor}
                                        theme={theme}
                                    />
                                ))}
                            </div>
                        )}
                            </>
                        )}
                    </>
                )}
            </main>

            {/* Confirm Leave Modal */}
            {confirmLeave && (
                <Modal
                    label="Confirm"
                    title="Leave course?"
                    onClose={() => setConfirmLeave(null)}
                    showClose={false}
                >
                    <div className="space-y-6">
                        <p className={theme.text}>
                            Are you sure you want to leave <span className="font-semibold">{confirmLeave.name}</span>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                className={`px-4 py-2 rounded-xl ${theme.card}`}
                                style={{ ...theme.borderStyle, borderWidth: "1px", borderStyle: "solid" }}
                                onClick={() => setConfirmLeave(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={leavingCourse}
                                className="px-4 py-2 rounded-xl font-semibold"
                                style={{
                                    backgroundColor: darkMode ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
                                    color: "#ef4444",
                                    opacity: leavingCourse ? 0.6 : 1,
                                    cursor: leavingCourse ? "not-allowed" : "pointer",
                                }}
                                onClick={confirmLeaveCourse}
                            >
                                {leavingCourse ? "Leaving..." : "Leave"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Submit Evidence Modal */}
            {submissionModal && (
                <Modal
                    label="Submit Evidence"
                    title={`Submit Evidence for: ${submissionModal.title}`}
                    onClose={() => setSubmissionModal(null)}
                >
                    <div className="space-y-6">
                        <p className={theme.textMuted}>
                            Upload a screenshot or image showing you completed this task. Your teacher will review it.
                        </p>

                        <div className="space-y-3">
                            <label className={`block text-sm font-medium ${theme.text}`}>
                                Upload Image
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                                id="evidence-upload"
                            />
                            <label
                                htmlFor="evidence-upload"
                                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${theme.card}`}
                                style={{ ...theme.borderStyle, borderStyle: 'dashed' }}
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain rounded" />
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <ImageIcon size={48} className={theme.textMuted} />
                                        <p className={`mt-2 text-sm ${theme.textMuted}`}>Click to upload image</p>
                                    </div>
                                )}
                            </label>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                className={`px-4 py-2 rounded-xl ${theme.card}`}
                                style={{ ...theme.borderStyle, borderWidth: "1px", borderStyle: "solid" }}
                                onClick={() => setSubmissionModal(null)}
                                disabled={uploadingImage}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!imageFile || uploadingImage}
                                className="px-4 py-2 rounded-xl font-semibold text-white"
                                style={{
                                    backgroundColor: (!imageFile || uploadingImage) ? '#6b7280' : accentColor,
                                    opacity: (!imageFile || uploadingImage) ? 0.5 : 1,
                                    cursor: (!imageFile || uploadingImage) ? 'not-allowed' : 'pointer',
                                }}
                                onClick={handleSubmitEvidence}
                            >
                                {uploadingImage ? 'Uploading...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Course Code Input Modal */}
            {showCodeInput && (
                <div 
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => {
                        setShowCodeInput(false);
                        setCourseCode("");
                        setCodeError("");
                    }}
                >
                    <div 
                        className={`${theme.card} rounded-2xl p-8 max-w-md w-full`}
                        style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: `${accentColor}20` }}
                            >
                                <Key size={24} style={{ color: accentColor }} />
                            </div>
                            <div>
                                <h3 className={`text-2xl font-bold ${theme.text}`}>Enter Course Code</h3>
                                <p className={`text-sm ${theme.textMuted}`}>Get the code from your teacher</p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <input
                                type="text"
                                value={courseCode}
                                onChange={(e) => {
                                    setCourseCode(e.target.value);
                                    setCodeError("");
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && courseCode.trim() && enrollingCourse !== "code-enrollment") {
                                        handleEnrollWithCode();
                                    }
                                }}
                                placeholder="Enter course code..."
                                className={`w-full px-4 py-3 rounded-xl font-mono text-lg ${theme.inputBg} ${theme.text} border-2 transition-colors`}
                                style={{
                                    borderColor: codeError ? '#ef4444' : `${accentColor}30`,
                                    outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = accentColor}
                                onBlur={(e) => e.target.style.borderColor = codeError ? '#ef4444' : `${accentColor}30`}
                                autoFocus
                            />
                            {codeError && (
                                <p className="text-red-500 text-sm mt-2">{codeError}</p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowCodeInput(false);
                                    setCourseCode("");
                                    setCodeError("");
                                }}
                                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${theme.inputBg} ${theme.text}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEnrollWithCode}
                                disabled={!courseCode.trim() || enrollingCourse === "code-enrollment"}
                                className="flex-1 px-4 py-3 rounded-xl font-medium transition-all text-white"
                                style={{
                                    backgroundColor: (!courseCode.trim() || enrollingCourse === "code-enrollment") ? '#6b7280' : accentColor,
                                    opacity: (!courseCode.trim() || enrollingCourse === "code-enrollment") ? 0.6 : 1,
                                    cursor: (!courseCode.trim() || enrollingCourse === "code-enrollment") ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {enrollingCourse === "code-enrollment" ? "Adding..." : "Add Course"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* Task Card Component */
function TaskCard({
    task,
    onComplete,
    onClaim,
    submission,
    darkMode,
    accentColor,
    theme
}: {
    task: Task;
    onComplete: (task: Task) => void;
    onClaim: (task: Task) => void;
    submission?: Submission;
    darkMode: boolean;
    accentColor: string;
    theme: any;
}) {
    const [completing, setCompleting] = useState(false);

    const difficultyColors = {
        easy: { bg: darkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(220, 252, 231, 1)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
        medium: { bg: darkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(254, 243, 199, 1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
        hard: { bg: darkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(254, 226, 226, 1)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
        extreme: { bg: darkMode ? `${accentColor}10` : `${accentColor}05`, text: accentColor, border: `${accentColor}30` }
    };

    const colors = difficultyColors[task.difficulty];

    async function handleComplete() {
        setCompleting(true);
        try {
            await onComplete(task);
        } finally {
            setCompleting(false);
        }
    }

    async function handleClaim() {
        setCompleting(true);
        try {
            await onClaim(task);
        } finally {
            setCompleting(false);
        }
    }

    const statusColors = {
        pending: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', label: 'Pending Review' },
        approved: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', label: 'Approved' },
        rejected: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: 'Needs Revision' },
    };

    return (
        <div
            className={`${theme.card} rounded-xl p-5 transition-colors duration-300`}
            style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}
        >
            <div className="flex justify-between items-start mb-3">
                <h3 className={`text-lg font-bold ${theme.text} flex-1`}>{task.title}</h3>
                <span
                    className="px-3 py-1 rounded-lg text-xs font-bold uppercase"
                    style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: colors.border
                    }}
                >
                    {task.difficulty}
                </span>
            </div>

            {task.description && (
                <p className={`${theme.textMuted} text-sm mb-4`}>{task.description}</p>
            )}

            {task.canvasUrl && (
                <div className="mb-3">
                    <a
                        href={task.canvasUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs ${theme.textMuted} hover:underline flex items-center gap-1`}
                    >
                        <LinkIcon className="w-3.5 h-3.5" /> Canvas Link
                    </a>
                </div>
            )}

            {submission && (
                <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: statusColors[submission.status].bg }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: statusColors[submission.status].text }}>
                        {statusColors[submission.status].label}
                    </p>
                    {submission.teacherComment && submission.status === 'rejected' && (
                        <p className={`text-xs ${theme.textMuted} mt-1`}>
                            Teacher feedback: {submission.teacherComment}
                        </p>
                    )}
                </div>
            )}

            {task.dueAt && (
                <div className="mb-3">
                    <p className={`text-xs ${theme.textSubtle} flex items-center gap-1`}>
                        <Calendar className="w-3.5 h-3.5" /> Due: {new Date(task.dueAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </p>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <Star size={16} style={{ color: accentColor }} />
                        <span className={`text-sm font-medium ${theme.text}`}>{task.xp} XP</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Coins size={16} className="text-yellow-500" />
                        <span className={`text-sm font-medium ${theme.text}`}>{task.gold} Gold</span>
                    </div>
                </div>

                {!submission && (
                    <button
                        onClick={handleComplete}
                        disabled={completing}
                        className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-white"
                        style={{
                            backgroundColor: completing ? '#6b7280' : accentColor,
                            opacity: completing ? 0.5 : 1,
                            cursor: completing ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <Upload size={16} />
                        {completing ? 'Submitting...' : 'Submit Evidence'}
                    </button>
                )}

                {submission?.status === 'approved' && !submission.claimedAt && (
                    <button
                        onClick={handleClaim}
                        disabled={completing}
                        className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-white"
                        style={{
                            backgroundColor: completing ? '#6b7280' : '#22c55e',
                            opacity: completing ? 0.5 : 1,
                            cursor: completing ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <Check size={16} />
                        {completing ? 'Claiming...' : 'Claim Rewards'}
                    </button>
                )}

                {submission?.status === 'rejected' && (
                    <button
                        onClick={handleComplete}
                        disabled={completing}
                        className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-white"
                        style={{
                            backgroundColor: completing ? '#6b7280' : accentColor,
                            opacity: completing ? 0.5 : 1,
                            cursor: completing ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <Upload size={16} />
                        {completing ? 'Resubmitting...' : 'Resubmit'}
                    </button>
                )}

                {submission?.status === 'pending' && (
                    <div className={`px-4 py-2 rounded-lg font-medium text-center ${theme.textMuted}`}>
                        Waiting for teacher review...
                    </div>
                )}

                {submission?.claimedAt && (
                    <div className={`px-4 py-2 rounded-lg font-medium text-center`} style={{ color: '#22c55e' }}>
                        ✓ Completed
                    </div>
                )}
            </div>
        </div>
    );
}

/* Difficulty Filter Component */
function DifficultyFilter({
    label,
    count,
    isSelected,
    onClick,
    color,
    darkMode
}: {
    label: string;
    count: number;
    isSelected: boolean;
    onClick: () => void;
    color: string;
    darkMode: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${isSelected
                ? 'text-white'
                : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
                }`}
            style={isSelected ? {
                backgroundColor: color
            } : {
                backgroundColor: darkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 1)'
            }}
        >
            {label} ({count})
        </button>
    );
}

/* Navigation Item Component */
function NavItem({
    icon,
    label,
    active = false,
    onClick,
    darkMode,
    accentColor
}: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
    darkMode: boolean;
    accentColor: string;
}) {
    return (
        <li>
            <button
                onClick={onClick}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all"
                style={active ? {
                    backgroundColor: darkMode ? `${accentColor}20` : `${accentColor}10`,
                    color: accentColor,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: darkMode ? `${accentColor}50` : `${accentColor}30`
                } : {
                    color: darkMode ? '#9ca3af' : '#6b7280'
                }}
            >
                {icon}
                <span className="font-medium">{label}</span>
            </button>
        </li>
    );
}
