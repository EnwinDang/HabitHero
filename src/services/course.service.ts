// src/services/course.service.ts
import { CoursesAPI } from "../api/courses.api";
import type { Course } from "../models/course.model";
import type { Module } from "../models/module.model";

export async function loadCourses(): Promise<Course[]> {
  return CoursesAPI.list(true);
}

export async function loadModules(courseId: string): Promise<Module[]> {
  return CoursesAPI.listModules(courseId);
}
