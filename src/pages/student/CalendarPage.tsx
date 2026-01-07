import { useState } from "react";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { db, auth } from "@/firebase";
import { collection, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import type { Task } from "@/models/task.model";
import {
  Calendar,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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

  // Get tasks for a specific day
  const getTasksForDay = (day: number): Task[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    return tasks.filter((task) => {
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
        // Calendar tasks don't have difficulty, XP, or gold
        difficulty: "easy",
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

                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative ${isToday(day) ? "" : ""
                      } ${isSelected(day) ? "" : ""}`}
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
                      className={`font-medium ${isToday(day) || isSelected(day) ? "" : theme.text
                        }`}
                      style={
                        isToday(day) || isSelected(day)
                          ? { color: accentColor }
                          : {}
                      }
                    >
                      {day}
                    </span>
                    {/* Task Indicators */}
                    {dayTasks.length > 0 && (
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
                    {selectedDayTasks.map((task) => (
                      <TaskCard
                        key={task.taskId}
                        task={task}
                        darkMode={darkMode}
                        accentColor={accentColor}
                        theme={theme}
                        onDelete={() => handleDeleteTask(task.taskId)}
                        onComplete={() => handleCompleteTask(task.taskId, task.isActive)}
                      />
                    ))}
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
    </div>
  );
}

/* Task Card Component */
function TaskCard({
  task,
  darkMode,
  accentColor: _accentColor,
  theme,
  onDelete,
  onComplete,
}: {
  task: Task;
  darkMode: boolean;
  accentColor: string;
  theme: ReturnType<typeof getThemeClasses>;
  onDelete: () => void;
  onComplete: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

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
          </div>
        </div>
        <div className="flex items-center gap-2">
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
              background: `linear-gradient(to right, ${accentColor}20, rgba(168, 85, 247, 0.1))`,
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
