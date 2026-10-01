import { ArrowLeft } from "@untitledui/icons";
import { useState, type FormEvent } from "react";
import { Logo } from "./Logo";

export type AuthMode = "signin" | "signup";

type AuthPageProps = {
  mode: AuthMode;
  configured: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, username: string) => Promise<boolean>;
  onGoogle: () => Promise<void>;
};

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

const fieldClass =
  "h-12 w-full rounded-lg bg-bg-secondary px-4 text-white outline-none ring ring-bg-tertiary";

export function AuthPage({ mode, configured, onSignIn, onSignUp, onGoogle }: AuthPageProps) {
  const signIn = mode === "signin";
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (!configured) {
        throw new Error("Supabase is not connected yet.");
      }
      if (signIn) {
        await onSignIn(email.trim(), password);
      } else {
        const session = await onSignUp(email.trim(), password, username.trim());
        if (!session) {
          setNotice("Account created. Check your email to confirm, then sign in.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await onGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setBusy(false);
    }
  };

  return (
    <main className="relative h-svh overflow-y-auto bg-bg-primary">
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4">
        <a href="#home" className="w-fit">
          <span className="inline-flex h-8 items-center gap-3 text-base">
            <ArrowLeft size={20} />
            Go back
          </span>
        </a>
        <div className="h-10" aria-hidden="true" />
      </header>
      <div className="flex min-h-svh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo large wordmark href="#home" />
        </div>
        <h1 className="mt-6 text-center text-4xl">{signIn ? "Welcome back" : "Create your account"}</h1>

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleGoogle()}
          className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-white px-5 font-bold text-bg-primary ring ring-white hover:bg-white/90 disabled:opacity-50"
        >
          <GoogleMark />
          Continue with Google
        </button>

        <p className="my-5 text-center text-sm text-white/45">or</p>

        <form className="flex flex-col gap-3" onSubmit={(event) => void handleSubmit(event)}>
          {signIn ? (
            <input
              type="text"
              required
              autoComplete="username"
              placeholder="Email or username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
            />
          ) : (
            <>
              <input
                type="text"
                required
                minLength={2}
                autoComplete="username"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className={fieldClass}
              />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClass}
              />
            </>
          )}
          <input
            type="password"
            required
            minLength={6}
            autoComplete={signIn ? "current-password" : "new-password"}
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClass}
          />

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {notice ? <p className="text-sm text-white/70">{notice}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 h-12 rounded-lg bg-white px-5 font-bold text-bg-primary ring ring-white hover:bg-white/90 disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Continue"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/45">
          By continuing, you agree to Polyfeed{" "}
          <a href="#terms" className="text-white hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#privacy" className="text-white hover:underline">
            Privacy Policy
          </a>
          .
        </p>
        <p className="mt-4 text-center text-sm text-white/55">
          {signIn ? "New to Polyfeed?" : "Already have an account?"}{" "}
          <a href={signIn ? "#signup" : "#signin"} className="text-white hover:underline">
            {signIn ? "Sign up" : "Log in"}
          </a>
        </p>
      </div>
      </div>
    </main>
  );
}
