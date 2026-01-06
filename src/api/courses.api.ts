import { apiFetch } from "./client";
import type { Course, CourseEnrollment } from "../models/course.model";
import type { Module } from "../models/module.model";

export const CoursesAPI = {
  list(activeOnly = true): Promise<Course[]> {
    return apiFetch<Course[]>(`/courses?activeOnly=${String(activeOnly)}`);
  },

  create(course: Course): Promise<Course> {
    return apiFetch<Course>("/courses", {
      method: "POST",
      body: JSON.stringify(course),
    });
  },

  get(courseId: string): Promise<Course> {
    return apiFetch<Course>(`/courses/${courseId}`);
  },

  replace(courseId: string, course: Course): Promise<Course> {
    return apiFetch<Course>(`/courses/${courseId}`, {
      method: "PUT",
      body: JSON.stringify(course),
    });
  },

  patch(courseId: string, patch: Partial<Course>): Promise<Course> {
    return apiFetch<Course>(`/courses/${courseId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  delete(courseId: string): Promise<void> {
    return apiFetch<void>(`/courses/${courseId}`, { method: "DELETE" });
  },

  // Enrollments
  listStudents(courseId: string): Promise<CourseEnrollment[]> {
    return apiFetch<CourseEnrollment[]>(`/courses/${courseId}/students`);
  },

  enroll(courseId: string, enrollment: CourseEnrollment): Promise<void> {
    return apiFetch<void>(`/courses/${courseId}/students`, {
      method: "POST",
      body: JSON.stringify(enrollment),
    });
  },

  unenroll(courseId: string, uid: string): Promise<void> {
    return apiFetch<void>(`/courses/${courseId}/students`, {
      method: "DELETE",
      body: JSON.stringify({ uid }),
    });
  },

  // Modules under course
  listModules(courseId: string): Promise<Module[]> {
    return apiFetch<Module[]>(`/courses/${courseId}/modules`);
  },

  createModule(courseId: string, module: Module): Promise<Module> {
    return apiFetch<Module>(`/courses/${courseId}/modules`, {
      method: "POST",
      body: JSON.stringify(module),
    });
  },
};

export const ModulesAPI = {
  get(moduleId: string): Promise<Module> {
    return apiFetch<Module>(`/modules/${moduleId}`);
  },

  replace(moduleId: string, module: Module): Promise<Module> {
    return apiFetch<Module>(`/modules/${moduleId}`, {
      method: "PUT",
      body: JSON.stringify(module),
    });
  },

  patch(moduleId: string, patch: Partial<Module>): Promise<Module> {
    return apiFetch<Module>(`/modules/${moduleId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  delete(moduleId: string): Promise<void> {
    return apiFetch<void>(`/modules/${moduleId}`, { method: "DELETE" });
  },
};
