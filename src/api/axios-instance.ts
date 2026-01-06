import axios from "axios";
import { auth } from "@/firebase";

export const api = axios.create({
  baseURL: "/api",
  timeout: 8000, // 8 second timeout to prevent long hangs
});

/**
 * 🔑 Axios interceptor - voegt automatisch Bearer token toe
 * Dit is CRUCIAAL voor /auth/me en andere endpoints
 */
api.interceptors.request.use(async (config) => {
  const fullUrl = `${config.baseURL || ""}${config.url || ""}`;
  console.log("📤 Axios request:", config.url, "→ Full URL:", fullUrl);
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
      console.log("✅ Token added:", token.substring(0, 50) + "...");
    } catch (err) {
      console.error("❌ Failed to get ID token:", err);
    }
  } else {
    console.warn("⚠️ No Firebase user - token not added");
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log("✅ Axios response:", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error("❌ Axios error:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data,
    });
    if (error.response?.status === 401) {
      console.warn("⚠️ Unauthorized - token invalid or expired");
    }
    return Promise.reject(error);
  }
);
