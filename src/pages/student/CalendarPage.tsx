import { useState, useEffect } from "react";
import type React from "react";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { db, auth, storage } from "@/firebase";
import { collection, addDoc, deleteDoc, doc, updateDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Task } from "@/models/task.model";
import { SubmissionsAPI, type Submission } from "@/api/submissions.api";
import { Modal } from "@/components/Modal";
import {
  Calendar,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

export default function CalendarPage() {
  const { user, loading: userLoading } = useRealtimeUser();
  const { tasks } = useRealtimeTasks();
  const { darkMode, accentColor } = useTheme();

  // Get theme classes
  const theme = getThemeClasses(darkMode, accentColor);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Add task modal state
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Submissions state
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [courseTasks, setCourseTasks] = useState<Task[]>([]);
  
  // Submission modal state
  const [submissionModal, setSubmissionModal] = useState<Task | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Load course tasks and submissions
  useEffect(() => {
    async function loadCourseTasks() {
      if (!user) return;
      
      try {
        // Get all courses and their modules to load tasks
        const coursesRef = collection(db, "courses");
        const coursesSnapshot = await getDocs(coursesRef);
        
        const allTasks: Task[] = [];
        const taskIds: string[] = [];
        
        for (const courseDoc of coursesSnapshot.docs) {
          const courseId = courseDoc.id;
          const modulesRef = collection(db, `courses/${courseId}/modules`);
          const modulesSnapshot = await getDocs(modulesRef);
          
          for (const moduleDoc of modulesSnapshot.docs) {
            const moduleId = moduleDoc.id;
            const tasksRef = collection(db, `courses/${courseId}/modules/${moduleId}/tasks`);
            const tasksSnapshot = await getDocs(tasksRef);
            
            tasksSnapshot.docs.forEach(taskDoc => {
              const task = {
                taskId: taskDoc.id,
                courseId,
                moduleId,
                ...taskDoc.data()
              } as Task;
              allTasks.push(task);
              taskIds.push(taskDoc.id);
            });
          }
        }
        
        setCourseTasks(allTasks);
        
        // Load submissions for all these tasks
        if (taskIds.length > 0) {
          const allSubmissions: Record<string, Submission> = {};
          
          // Group tasks by course and module for efficient loading
          const tasksByCourseModule = new Map<string, Task[]>();
          allTasks.forEach(task => {
            if (task.courseId && task.moduleId) {
              const key = `${task.courseId}:${task.moduleId}`;
              if (!tasksByCourseModule.has(key)) {
                tasksByCourseModule.set(key, []);
              }
              tasksByCourseModule.get(key)!.push(task);
            }
          });
          
          // Load submissions per course/module
          for (const [key, moduleTasks] of tasksByCourseModule) {
            const [courseId, moduleId] = key.split(':');
            const subs = await SubmissionsAPI.listLatestByTasks(
              moduleTasks.map(t => t.taskId),
              courseId,
              moduleId
            );
            Object.assign(allSubmissions, subs);
          }
          
          setSubmissions(allSubmissions);
        }
      } catch (error) {
        console.error("Error loading course tasks:", error);
      }
    }
    
    loadCourseTasks();
  }, [user]);



  if (userLoading) {
    return (
      <div
        className={`min-h-screen ${theme.bg} flex items-center justify-center transition-colors duration-300`}
      >
        <div className="text-xl animate-pulse" style={theme.accentText}>
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDay = firstDayOfMonth.getDay();

  const today = new Date();
  const isToday = (day: number) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === day
    );
  };

  // Get tasks for a specific day (including personal tasks and course tasks)
  const getTasksForDay = (day: number): Task[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    // Combine personal tasks and course tasks
    const allTasks = [...tasks, ...courseTasks];
    return allTasks.filter((task) => {
      // Check date field
      if (task.date === dateStr) return true;
      // Check dueAt timestamp
      if (task.dueAt) {
        const dueDate = new Date(task.dueAt);
        return (
          dueDate.getFullYear() === year &&
          dueDate.getMonth() === month &&
          dueDate.getDate() === day
        );
      }
      return false;
    });
  };

  // Calculate completion for a specific day (course tasks only)
  const getDayCompletion = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    // Only consider course tasks (not personal tasks)
    const dayCourseTasks = courseTasks.filter((task) => {
      if (task.date === dateStr) return true;
      if (task.dueAt) {
        const dueDate = new Date(task.dueAt);
        return (
          dueDate.getFullYear() === year &&
          dueDate.getMonth() === month &&
          dueDate.getDate() === day
        );
      }
      return false;
    });
    const total = dayCourseTasks.length;
    if (total === 0) return { completed: 0, total: 0 };
    // Count approved submissions for these tasks
    let completed = 0;
    for (const task of dayCourseTasks) {
      const sub = submissions[task.taskId];
      if (sub && sub.status === 'approved') completed++;
    }
    return { completed, total };
  };

  // Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Handle day click
  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(year, month, day));
  };

  // Add new task - writes directly to Firestore
  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !selectedDate) return;

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      console.error("No authenticated user");
      return;
    }

    setIsSubmitting(true);
    try {
      const dateStr = `${selectedDate.getFullYear()}-${String(
        selectedDate.getMonth() + 1
      ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

      // Write directly to Firestore
      const tasksRef = collection(db, "users", firebaseUser.uid, "tasks");
      await addDoc(tasksRef, {
        title: newTaskTitle,
        date: dateStr,
        dueAt: selectedDate.getTime(),
        isActive: true,
        createdAt: Date.now(),
        // Student-created tasks don't have difficulty, XP, or gold
        xp: 0,
        gold: 0,
        isRepeatable: false,
      });

      console.log("✅ Task created successfully!");
      setNewTaskTitle("");
      setShowAddTask(false);
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete task from Firestore
  const handleDeleteTask = async (taskId: string) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      console.error("No authenticated user");
      return;
    }

    try {
      const taskRef = doc(db, "users", firebaseUser.uid, "tasks", taskId);
      await deleteDoc(taskRef);
      console.log("🗑️ Task deleted successfully!");
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  // Complete task - toggle isActive status
  const handleCompleteTask = async (taskId: string, currentStatus: boolean) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      console.error("No authenticated user");
      return;
    }

    try {
      const taskRef = doc(db, "users", firebaseUser.uid, "tasks", taskId);
      await updateDoc(taskRef, {
        isActive: !currentStatus, // Toggle active status
      });
      console.log("✅ Task completed successfully!");
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  // Image selection for submission modal
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  };

  // Submit evidence for course assignment
  const handleSubmitEvidence = async () => {
    if (!submissionModal || !imageFile || !user) return;

    try {
      setUploadingImage(true);

      const ext = imageFile.name.split('.').pop() || 'jpg';
      const path = `submissions/${submissionModal.courseId}/${submissionModal.moduleId}/${submissionModal.taskId}/${user.uid}/${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(storageRef);

      const created = await SubmissionsAPI.create(
        submissionModal.taskId,
        submissionModal.courseId!,
        submissionModal.moduleId!,
        imageUrl
      );

      setSubmissions((prev) => ({
        ...prev,
        [submissionModal.taskId]: created,
      }));

      // Reset modal state
      setSubmissionModal(null);
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error('Failed to submit evidence:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  // Get selected day tasks
  const selectedDayTasks = selectedDate
    ? getTasksForDay(selectedDate.getDate())
    : [];

  // Generate calendar grid
  const calendarDays = [];
  for (let i = 0; i < startingDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
      <main className="p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className={`text-3xl font-bold ${theme.text}`}>Calendar</h2>
            <p className={theme.textMuted}>Plan and track your tasks</p>
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 rounded-xl font-medium transition-all"
            style={{
              backgroundColor: accentColor,
              color: "white",
            }}
          >
            Today
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div
            className={`lg:col-span-2 ${theme.card} rounded-2xl p-6`}
            style={{
              ...theme.borderStyle,
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            {/* Month Navigation */}
            <div className="flex justify-between items-center mb-6 gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentDate(new Date(year - 1, month, 1))}
                  aria-label="Previous year"
                  className={`px-3 py-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} focus-visible:outline-none`}
                  style={{
                    borderWidth: "1px",
                    borderStyle: "solid",
                    ...theme.borderStyle,
                    color: accentColor,
                  }}
                >
                  <ChevronsLeft size={20} strokeWidth={2.5} />
                </button>
                <button
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className={`px-3 py-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} focus-visible:outline-none`}
                  style={{
                    borderWidth: "1px",
                    borderStyle: "solid",
                    ...theme.borderStyle,
                    color: accentColor,
                  }}
                >
                  <ChevronLeft size={20} strokeWidth={2.5} />
                </button>
              </div>
              <h3 className={`text-2xl font-bold ${theme.text} min-w-fit`}>
                {monthNames[month]} {year}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={nextMonth}
                  aria-label="Next month"
                  className={`px-3 py-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} focus-visible:outline-none`}
                  style={{
                    borderWidth: "1px",
                    borderStyle: "solid",
                    ...theme.borderStyle,
                    color: accentColor,
                  }}
                >
                  <ChevronRight size={20} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(year + 1, month, 1))}
                  aria-label="Next year"
                  className={`px-3 py-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} focus-visible:outline-none`}
                  style={{
                    borderWidth: "1px",
                    borderStyle: "solid",
                    ...theme.borderStyle,
                    color: accentColor,
                  }}
                >
                  <ChevronsRight size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className={`text-center py-2 text-sm font-medium ${theme.textMuted}`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return (
                    <div key={`empty-${index}`} className="aspect-square" />
                  );
                }

                const dayTasks = getTasksForDay(day);
                const hasActiveTasks = dayTasks.some((t) => t.isActive);
                const hasCompletedTasks = dayTasks.some((t) => !t.isActive);
                const { completed, total } = getDayCompletion(day);

                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative ${isToday(day) ? "" : ""} ${isSelected(day) ? "" : ""}`}
                    style={{
                      backgroundColor: isSelected(day)
                        ? `${accentColor}30`
                        : isToday(day)
                          ? darkMode
                            ? "rgba(88, 28, 135, 0.3)"
                            : "rgba(243, 232, 255, 1)"
                          : darkMode
                            ? "rgba(55, 65, 81, 0.2)"
                            : "rgba(249, 250, 251, 1)",
                      borderWidth:
                        isSelected(day) || isToday(day) ? "2px" : "1px",
                      borderStyle: "solid",
                      borderColor: isSelected(day)
                        ? accentColor
                        : isToday(day)
                          ? `${accentColor}50`
                          : "transparent",
                    }}
                  >
                    <span
                      className={`font-medium ${isToday(day) || isSelected(day) ? "" : theme.text}`}
                      style={
                        isToday(day) || isSelected(day)
                          ? { color: accentColor }
                          : {}
                      }
                    >
                      {day}
                    </span>
                    {/* Completion Bar for course tasks */}
                    {total > 0 && (
                      <div className="w-full mt-1 flex flex-col items-center">
                        <div className={`h-1.5 rounded-full w-5/6 ${darkMode ? "bg-gray-800" : "bg-gray-200"}`} style={{ overflow: "hidden" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(completed / total) * 100}%`,
                              backgroundColor: accentColor,
                            }}
                          />
                        </div>
                        <span className="text-[10px] mt-0.5" style={{ color: accentColor }}>{completed}/{total}</span>
                      </div>
                    )}
                    {/* Task Indicators (personal tasks) */}
                    {dayTasks.length > 0 && total === 0 && (
                      <div className="flex gap-1 mt-1">
                        {hasActiveTasks && (
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                        {hasCompletedTasks && (
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div
              className="flex justify-center gap-6 mt-4 pt-4"
              style={{
                borderTopWidth: "1px",
                borderTopStyle: "solid",
                ...theme.borderStyle,
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className={`text-sm ${theme.textMuted}`}>
                  Active Tasks
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className={`text-sm ${theme.textMuted}`}>Completed</span>
              </div>
            </div>
          </div>

          {/* Selected Day Details */}
          <div
            className={`${theme.card} rounded-2xl p-6`}
            style={{
              ...theme.borderStyle,
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            {selectedDate ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-xl font-bold ${theme.text}`}>
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </h3>
                  <button
                    onClick={() => setShowAddTask(true)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: accentColor,
                      color: "white",
                    }}
                  >
                    +
                  </button>
                </div>

                {selectedDayTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar
                      size={40}
                      className={`mb-4 mx-auto ${darkMode ? "text-gray-100" : "text-gray-400"
                        }`}
                    />
                    <p className={theme.textMuted}>No tasks for this day</p>
                    <button
                      onClick={() => setShowAddTask(true)}
                      className="mt-4 text-sm font-medium"
                      style={theme.accentText}
                    >
                      + Add a task
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayTasks.map((task) => {
                      const isCourseAssignment = !!(task.courseId && task.moduleId);
                      return (
                        <TaskCard
                          key={task.taskId}
                          task={task}
                          darkMode={darkMode}
                          accentColor={accentColor}
                          theme={theme}
                          submission={submissions[task.taskId]}
                          onDelete={() => handleDeleteTask(task.taskId)}
                          onComplete={() =>
                            isCourseAssignment
                              ? setSubmissionModal(task)
                              : handleCompleteTask(task.taskId, task.isActive)
                          }
                        />
                      );
                    })}
                  </div>
                )}

                {/* Add Task Form */}
                {showAddTask && (
                  <div
                    className="mt-4 p-4 rounded-xl"
                    style={{
                      backgroundColor: darkMode
                        ? "rgba(55, 65, 81, 0.3)"
                        : "rgba(243, 244, 246, 1)",
                    }}
                  >
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Task title..."
                      className={`w-full p-3 rounded-lg mb-3 ${theme.inputBg} ${theme.text}`}
                      style={{
                        borderWidth: "1px",
                        borderStyle: "solid",
                        ...theme.borderStyle,
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddTask}
                        disabled={isSubmitting || !newTaskTitle.trim()}
                        className="flex-1 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50"
                        style={{
                          backgroundColor: accentColor,
                        }}
                      >
                        {isSubmitting ? "Adding..." : "Add Task"}
                      </button>
                      <button
                        onClick={() => setShowAddTask(false)}
                        className={`px-4 py-2 rounded-lg ${darkMode
                          ? "bg-gray-700 text-gray-300"
                          : "bg-gray-200 text-gray-700"
                          }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Calendar
                  size={40}
                  className={`mb-4 mx-auto ${darkMode ? "text-gray-500" : "text-gray-400"
                    }`}
                />
                <p className={theme.textMuted}>Select a day to view tasks</p>
              </div>
            )}
          </div>
        </div>
      </main>
      {/* Submission Modal */}
      {submissionModal && (
      <Modal
        title={`Submit Evidence: ${submissionModal.title}`}
        onClose={() => {
          setSubmissionModal(null);
          setImageFile(null);
          setImagePreview(null);
        }}
        label="Assignment Submission"
        maxWidth={640}
        showClose
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <ImageIcon size={20} className="text-gray-500" />
            </div>
            <div>
              <div className="font-medium">Upload your evidence image</div>
              <div className="text-sm text-gray-500">JPG, PNG, or GIF. Max 5MB.</div>
            </div>
          </div>

          {imagePreview ? (
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <img src={imagePreview} alt="Preview" className="w-full object-contain max-h-80" />
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 border-gray-300 dark:border-gray-700">
              <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <ImageIcon size={28} className="text-gray-400" />
              <div className="text-sm text-gray-500">Click to upload an image</div>
            </label>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setSubmissionModal(null);
                setImageFile(null);
                setImagePreview(null);
              }}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              disabled={uploadingImage}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitEvidence}
              disabled={!imageFile || uploadingImage}
              className="px-4 py-2 rounded-lg text-white disabled:opacity-60"
              style={{ backgroundColor: accentColor }}
            >
              {uploadingImage ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </Modal>
    )}
    </div>
  );
}

/* Task Card Component */
function TaskCard({
  task,
  darkMode,
  accentColor,
  theme,
  submission,
  onDelete,
  onComplete,
}: {
  task: Task;
  darkMode: boolean;
  accentColor: string;
  theme: ReturnType<typeof getThemeClasses>;
  submission?: Submission;
  onDelete: () => void;
  onComplete: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Check if this is a course assignment (has courseId and moduleId)
  const isCourseAssignment = !!(task.courseId && task.moduleId);
  
  // Get submission status icon and text
  const getSubmissionStatus = () => {
    if (!submission) return null;
    
    switch (submission.status) {
      case 'pending':
        return { icon: Clock, text: 'Pending Review', color: 'text-yellow-500' };
      case 'approved':
        return { icon: CheckCircle2, text: 'Approved', color: 'text-green-500' };
      case 'rejected':
        return { icon: XCircle, text: 'Rejected', color: 'text-red-500' };
      default:
        return null;
    }
  };
  
  const submissionStatus = getSubmissionStatus();
  
  // Determine which button to show for course assignments
  const getSubmitButton = () => {
    if (!isCourseAssignment) return null;
    
    // No submission yet - show Submit button
    if (!submission) {
      return (
        <button
          onClick={onComplete}
          className="px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 text-white text-sm"
          style={{ backgroundColor: accentColor }}
          title="Submit evidence"
        >
          <Upload size={14} />
          Submit
        </button>
      );
    }
    
    // Rejected - show Resubmit button
    if (submission.status === 'rejected') {
      return (
        <button
          onClick={onComplete}
          className="px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 text-white text-sm"
          style={{ backgroundColor: accentColor }}
          title="Resubmit evidence"
        >
          <Upload size={14} />
          Resubmit
        </button>
      );
    }
    
    // Pending - show waiting message
    if (submission.status === 'pending') {
      return (
        <div className="px-3 py-1.5 text-xs text-yellow-500 italic">
          Awaiting review
        </div>
      );
    }
    
    // Approved - show completed checkmark
    if (submission.status === 'approved') {
      return (
        <div className="flex items-center gap-1 text-green-500 text-sm">
          <Check size={16} />
          <span className="text-xs">Completed</span>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div
      className={`p-4 rounded-xl transition-all ${task.isActive ? "" : "opacity-60"
        }`}
      style={{
        backgroundColor: darkMode
          ? "rgba(55, 65, 81, 0.3)"
          : "rgba(249, 250, 251, 1)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p
            className={`font-medium ${task.isActive ? theme.text : "line-through " + theme.textMuted
              }`}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs px-2 py-1 rounded ${theme.textMuted}`}>
              Due: {task.date || (task.dueAt ? new Date(task.dueAt).toLocaleDateString() : 'No date')}
            </span>
            {submissionStatus && (
              <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${submissionStatus.color}`}>
                {submissionStatus.icon && <submissionStatus.icon size={14} />}
                {submissionStatus.text}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* For course assignments, show submit/resubmit buttons */}
          {isCourseAssignment ? (
            getSubmitButton()
          ) : (
            <>
              {/* For personal tasks, show complete/delete buttons */}
              {!task.isActive && <Check size={18} className={darkMode ? "text-emerald-300" : "text-green-500"} />}
              {task.isActive && (
                <button
                  onClick={onComplete}
                  className={`${darkMode ? "text-emerald-300 hover:text-emerald-200" : "text-green-500 hover:text-green-600"} p-1 rounded transition-colors`}
                  title="Mark as complete"
                >
                  <Check size={18} />
                </button>
              )}
              {showConfirm ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      onDelete();
                      setShowConfirm(false);
                    }}
                    className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className={`text-xs px-2 py-1 ${darkMode ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-500 hover:bg-gray-600"} text-white rounded transition-colors`}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  className={`${darkMode ? "text-red-300 hover:text-red-200" : "text-red-400 hover:text-red-500"} p-1 rounded transition-colors`}
                  title="Delete task"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* Navigation Item Component */
function NavItem({
  icon,
  label,
  active = false,
  onClick,
  darkMode,
  accentColor,
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
        style={
          active
            ? {
              background: `${accentColor}20`,
              color: accentColor,
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: `${accentColor}50`,
            }
            : {
              color: darkMode ? "#9ca3af" : "#6b7280",
            }
        }
      >
        {icon}
        <span className="font-medium">{label}</span>
      </button>
    </li>
  );
}
