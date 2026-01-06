import { CoursesAPI, UsersAPI } from "@/api";

/**
 * Get all student names for a course
 */
export async function getStudentNamesForCourse(courseId: string) {
  const students = await CoursesAPI.listStudents(courseId);
  
  const studentNames = await Promise.all(
    students.map(student => 
      UsersAPI.get(student.uid).then(user => ({
        uid: student.uid,
        name: user.displayName
      }))
    )
  );
  
  return studentNames;
}
