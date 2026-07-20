import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Navigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import { Eye, EyeOff, Lock, Mail, Stethoscope, AlertTriangle, ShieldAlert } from "lucide-react";

// Login payload validator
const loginFormSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export const Login: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "admin@hospital.local",
      password: "Admin@12345",
    },
  });

  // Track Caps Lock state
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      setIsCapsLockOn(true);
    } else {
      setIsCapsLockOn(false);
    }
  };

  // If already authenticated, redirect straight to dashboard
  if (isAuthenticated && !isLoading) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data: LoginFormValues) => {
    setApiError(null);
    try {
      await login(data);
      navigate("/", { replace: true });
    } catch (error: any) {
      setApiError(
        error.response?.data?.message || "Invalid credentials. Please verify your details."
      );
    }
  };

  const handleSelectRole = (email: string, pass: string = "password123") => {
    setValue("email", email);
    setValue("password", pass);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-radial from-gray-50 to-gray-100 px-4 py-12 sm:px-6 lg:px-8">
      {/* Environment Badge */}
      <div className="absolute top-4 right-4 z-10">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span>Development Sandbox</span>
        </span>
      </div>

      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 transition duration-300 hover:shadow-2xl">
        {/* Header and Branding */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
            <Stethoscope className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              St. Jude Healthcare Portal
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 max-w-xs mx-auto">
              Access your clinical console, inventory registry, or administrative dashboard.
            </p>
          </div>
        </div>

        {/* Sandbox Quick Select Helper */}
        <div className="p-4 bg-indigo-50/70 border border-indigo-100/80 rounded-xl space-y-3">
          <p className="text-xs font-semibold text-indigo-800 flex items-center space-x-1">
            <ShieldAlert className="h-3.5 w-3.5 text-indigo-500" />
            <span>Select a Sandbox Role to Auto-Fill:</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSelectRole("admin@hospital.local", "Admin@12345")}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white text-indigo-700 rounded-lg border border-indigo-200 hover:bg-indigo-50 cursor-pointer transition shadow-xs"
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleSelectRole("admin@hms.com")}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white text-indigo-700 rounded-lg border border-indigo-200 hover:bg-indigo-50 cursor-pointer transition shadow-xs"
            >
              System Admin
            </button>
            <button
              type="button"
              onClick={() => handleSelectRole("doctor@hms.com")}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white text-indigo-700 rounded-lg border border-indigo-200 hover:bg-indigo-50 cursor-pointer transition shadow-xs"
            >
              Doctor
            </button>
            <button
              type="button"
              onClick={() => handleSelectRole("receptionist@hms.com")}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white text-indigo-700 rounded-lg border border-indigo-200 hover:bg-indigo-50 cursor-pointer transition shadow-xs"
            >
              Receptionist
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {apiError && (
            <div className="p-3.5 bg-red-50 text-red-800 rounded-lg text-sm border border-red-200 flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Email input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="name@hospital.local"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder-gray-400"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password input */}
            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert("Password recovery is managed by the System Administrator.")}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyDown}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Caps Lock warning */}
              {isCapsLockOn && (
                <div className="mt-1.5 flex items-center space-x-1 text-xs text-amber-700 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Caps Lock is ON</span>
                </div>
              )}

              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-sm cursor-pointer"
            />
            <label htmlFor="remember-me" className="ml-2 block text-xs font-semibold text-gray-600 cursor-pointer">
              Remember my session
            </label>
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="w-full justify-center py-2.5 rounded-lg text-sm font-semibold cursor-pointer shadow-sm"
            >
              {isSubmitting ? "Verifying Credentials..." : "Sign In to Portal"}
            </Button>
          </div>
        </form>

        {/* Footer info */}
        <div className="text-center border-t border-gray-100 pt-4">
          <p className="text-2xs font-semibold text-gray-400 tracking-wider uppercase">
            ST. JUDE HMS ENTERPRISE • VERSION 2.4.0-RELEASE
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
