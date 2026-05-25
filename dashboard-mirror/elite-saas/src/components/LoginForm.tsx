"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";

interface LoginFormProps {
  mode: "login" | "signup";
  devMode: boolean;
  lang?: Lang;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LoginFormInner({ mode, devMode, lang = "it" }: LoginFormProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const tr = (key: string) => t(lang, key);

  const errorCode = searchParams.get("error");
  const errorMessage = errorCode ? tr(`error.${errorCode}`) : null;

  function handleGoogleLogin() {
    setGoogleLoading(true);
    window.location.href = "/api/auth/google";
  }

  async function handleDevLogin() {
    setDevLoading(true);
    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        redirect: "manual",
      });
      // 303 redirect response: follow manually
      if (res.type === "opaqueredirect" || res.status === 0 || res.status === 303 || res.redirected) {
        router.push("/sites");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Dev login error:", data);
      }
      router.push("/sites");
    } catch {
      router.push("/sites");
    } finally {
      setDevLoading(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="elite-form-panel">
      {/* Error banner */}
      {errorMessage && (
        <div className="elite-error-banner" role="alert">
          <span className="elite-error-dot" aria-hidden="true">&#9632;</span>
          {errorMessage}
        </div>
      )}

      {/* Google OAuth button */}
      <button
        onClick={handleGoogleLogin}
        disabled={googleLoading || devLoading}
        className="elite-google-btn"
        type="button"
        aria-label={tr("form.continueGoogle")}
      >
        {googleLoading ? (
          <>
            <SpinnerIcon />
            <span>{tr("form.connecting")}</span>
          </>
        ) : (
          <>
            <GoogleIcon />
            <span>{tr("form.continueGoogle")}</span>
          </>
        )}
      </button>

      {/* Dev login — only rendered when AUTH_DEV_MODE=true */}
      {devMode && (
        <div className="elite-dev-section">
          <div className="elite-dev-divider">
            <span>{tr("form.devSection")}</span>
          </div>
          <button
            onClick={handleDevLogin}
            disabled={googleLoading || devLoading}
            className="elite-dev-btn"
            type="button"
            aria-label={tr("form.devLogin")}
          >
            {devLoading ? (
              <>
                <SpinnerIcon />
                <span>{tr("form.devLoginAccessing")}</span>
              </>
            ) : (
              <>
                <span className="elite-dev-badge">DEV</span>
                <span>{tr("form.devLogin")}</span>
              </>
            )}
          </button>
          <p className="elite-dev-note">{tr("form.devLoginNote")}</p>
        </div>
      )}

      {/* Mode switcher */}
      <p className="elite-mode-link">
        {isLogin ? (
          <>
            {tr("form.modeLink.loginPrefix")}{" "}
            <Link href="/signup" className="elite-link">
              {tr("form.modeLink.loginCta")}
            </Link>
          </>
        ) : (
          <>
            {tr("form.modeLink.signupPrefix")}{" "}
            <Link href="/login" className="elite-link">
              {tr("form.modeLink.signupCta")}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

export function LoginForm(props: LoginFormProps) {
  return (
    <Suspense fallback={<div className="elite-form-panel" />}>
      <LoginFormInner {...props} />
    </Suspense>
  );
}
