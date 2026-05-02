import { ArrowLeft, Camera, Check, Clock, Flame, Power, Snowflake } from "lucide-react";
import { useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const FLOWS = {
  Reheat: ["Press POWER", "Press REHEAT", "Set time (1:00)", "Press START"],
  Defrost: ["Press POWER", "Press DEFROST", "Enter weight/time", "Press START"],
  Timer: ["Press TIMER", "Set time", "Press START"]
};

const ACTIONS = [
  { name: "Reheat", icon: Flame },
  { name: "Defrost", icon: Snowflake },
  { name: "Timer", icon: Clock }
];

function App() {
  const savedAuth = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("pressly-auth") || "null");
    } catch {
      return null;
    }
  }, []);

  const [auth, setAuth] = useState(savedAuth);
  const [screen, setScreen] = useState(savedAuth ? "scan" : "auth");
  const [authMode, setAuthMode] = useState("login");
  const [activeAction, setActiveAction] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function saveAuth(nextAuth) {
    localStorage.setItem("pressly-auth", JSON.stringify(nextAuth));
    setAuth(nextAuth);
    setScreen("scan");
  }

  function logout() {
    localStorage.removeItem("pressly-auth");
    setAuth(null);
    setScreen("auth");
    setActiveAction("");
    setStepIndex(0);
  }

  async function submitAuth(formData) {
    setMessage("");

    const endpoint = authMode === "login" ? "login" : "signup";
    const payload = {
      email: formData.get("email"),
      password: formData.get("password")
    };

    if (authMode === "signup") {
      payload.name = formData.get("name");
    }

    try {
      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      saveAuth(data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function startAction(action) {
    setActiveAction(action);
    setStepIndex(0);
    setScreen("guide");
  }

  async function finishAction() {
    if (!activeAction || !auth?.token) {
      setScreen("done");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({ action: activeAction })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Session could not be saved.");
      }

      setScreen("done");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  const steps = activeAction ? FLOWS[activeAction] : [];
  const isLastStep = stepIndex === steps.length - 1;

  return (
    <main className="min-h-dvh bg-background text-text">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-6">
        {screen !== "auth" && screen !== "scan" && (
          <header className="mb-4 flex items-center justify-between">
            <button
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-high text-text"
              type="button"
              onClick={() => {
                if (screen === "scan") logout();
                if (screen === "actions") setScreen("scan");
                if (screen === "guide") {
                  stepIndex === 0 ? setScreen("actions") : setStepIndex(stepIndex - 1);
                }
                if (screen === "done") setScreen("scan");
              }}
              aria-label="Back"
            >
              <ArrowLeft size={24} strokeWidth={3} />
            </button>
            <p className="text-sm font-semibold text-muted">{auth?.user?.name || "pressly"}</p>
          </header>
        )}

        {screen === "auth" && (
          <AuthScreen
            authMode={authMode}
            message={message}
            setAuthMode={setAuthMode}
            submitAuth={submitAuth}
          />
        )}

        {screen === "scan" && <ScanScreen onScan={() => setScreen("actions")} />}

        {screen === "actions" && <ActionScreen onSelect={startAction} />}

        {screen === "guide" && (
          <GuideScreen
            action={activeAction}
            currentStep={stepIndex + 1}
            totalSteps={steps.length}
            instruction={steps[stepIndex]}
            isLastStep={isLastStep}
            message={message}
            saving={saving}
            onBack={() => (stepIndex === 0 ? setScreen("actions") : setStepIndex(stepIndex - 1))}
            onNext={() => (isLastStep ? finishAction() : setStepIndex(stepIndex + 1))}
          />
        )}

        {screen === "done" && <DoneScreen action={activeAction} onRestart={() => setScreen("scan")} />}
      </div>
    </main>
  );
}

function AuthScreen({ authMode, message, setAuthMode, submitAuth }) {
  return (
    <section className="flex min-h-dvh flex-col justify-center gap-8 pb-8">
      <div>
        <p className="mb-2 text-sm font-bold uppercase tracking-wider text-primary">pressly</p>
        <h1 className="text-4xl font-black leading-tight">Microwave help, one step at a time.</h1>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submitAuth(new FormData(event.currentTarget));
        }}
      >
        {authMode === "signup" && (
          <label className="flex flex-col gap-2 text-sm font-semibold text-muted">
            Name
            <input
              className="h-16 rounded-2xl border border-transparent bg-surface px-5 text-lg text-text outline-none focus:border-primary"
              name="name"
              placeholder="Your name"
              required
            />
          </label>
        )}

        <label className="flex flex-col gap-2 text-sm font-semibold text-muted">
          Email
          <input
            className="h-16 rounded-2xl border border-transparent bg-surface px-5 text-lg text-text outline-none focus:border-primary"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-muted">
          Password
          <input
            className="h-16 rounded-2xl border border-transparent bg-surface px-5 text-lg text-text outline-none focus:border-primary"
            minLength={4}
            name="password"
            placeholder="4+ characters"
            required
            type="password"
          />
        </label>

        {message && <p className="rounded-2xl bg-surface-high p-4 text-sm font-semibold text-primary">{message}</p>}

        <button className="mt-2 h-16 rounded-3xl bg-primary text-xl font-black text-on-primary" type="submit">
          {authMode === "login" ? "Log In" : "Sign Up"}
        </button>
      </form>

      <button
        className="h-14 rounded-3xl border-2 border-outline text-base font-bold text-text"
        type="button"
        onClick={() => {
          setAuthMode(authMode === "login" ? "signup" : "login");
        }}
      >
        {authMode === "login" ? "Create account" : "Use existing account"}
      </button>
    </section>
  );
}

function ScanScreen({ onScan }) {
  return (
    <section className="relative -mx-6 -my-6 flex min-h-dvh flex-col overflow-hidden bg-black px-6 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(173,198,255,0.18),transparent_32%),linear-gradient(180deg,#1e2424_0%,#0a0d0d_55%,#050606_100%)]" />
      <div className="absolute inset-x-8 top-20 h-72 rounded-[32px] border border-white/10 bg-surface/70 shadow-soft">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
          <Power className="text-primary" size={26} />
          <div className="h-8 flex-1 rounded-lg bg-black/60" />
          <div className="h-8 w-20 rounded-lg bg-black/50" />
        </div>
        <div className="grid h-56 grid-cols-[1fr_88px] gap-4 p-4">
          <div className="rounded-full border-[14px] border-[#303638] bg-black/60 shadow-inner" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="rounded-lg bg-black/50 shadow-inner" />
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center">
        <div className="relative h-72 w-72 rounded-[36px] border-4 border-primary/40">
          <Corner className="-left-1 -top-1 rounded-tl-[36px] border-l-8 border-t-8" />
          <Corner className="-right-1 -top-1 rounded-tr-[36px] border-r-8 border-t-8" />
          <Corner className="-bottom-1 -left-1 rounded-bl-[36px] border-b-8 border-l-8" />
          <Corner className="-bottom-1 -right-1 rounded-br-[36px] border-b-8 border-r-8" />
          <div className="scan-line absolute left-4 right-4 top-1/2 h-1 rounded-full bg-primary shadow-[0_0_18px_rgba(173,198,255,0.75)]" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-5 pb-4">
        <div className="rounded-full bg-surface-high/95 px-6 py-4 shadow-soft">
          <p className="text-xl font-black leading-8">Point your camera at the appliance buttons</p>
        </div>
        <button
          className="flex h-20 items-center justify-center gap-4 rounded-[28px] bg-primary text-2xl font-black text-on-primary shadow-soft active:scale-[0.98]"
          type="button"
          onClick={onScan}
        >
          <Camera size={34} strokeWidth={3} />
          Scan Panel
        </button>
      </div>
    </section>
  );
}

function Corner({ className }) {
  return <div className={`absolute h-14 w-14 border-primary ${className}`} />;
}

function ActionScreen({ onSelect }) {
  return (
    <section className="flex flex-1 flex-col justify-center gap-8">
      <div>
        <p className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">Microwave detected</p>
        <h1 className="text-4xl font-black leading-tight">What do you want to do?</h1>
      </div>

      <div className="grid gap-4">
        {ACTIONS.map(({ name, icon: Icon }) => (
          <button
            key={name}
            className="flex min-h-24 items-center gap-5 rounded-[28px] bg-surface-high px-6 text-left text-3xl font-black text-text shadow-soft active:scale-[0.99]"
            type="button"
            onClick={() => onSelect(name)}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary">
              <Icon size={30} strokeWidth={3} />
            </span>
            {name}
          </button>
        ))}
      </div>
    </section>
  );
}

function GuideScreen({
  action,
  currentStep,
  totalSteps,
  instruction,
  isLastStep,
  message,
  saving,
  onBack,
  onNext
}) {
  return (
    <section className="flex flex-1 flex-col">
      <div className="mb-8">
        <p className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">{action}</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full ${index < currentStep ? "bg-primary" : "bg-surface-high"}`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-6">
        <p className="text-lg font-bold text-muted">
          Step {currentStep} of {totalSteps}
        </p>
        <h1 className="text-5xl font-black leading-tight">{instruction}</h1>
      </div>

      {message && <p className="mb-4 rounded-2xl bg-surface-high p-4 text-sm font-semibold text-primary">{message}</p>}

      <div className="grid grid-cols-2 gap-4 pb-2">
        <button
          className="h-16 rounded-3xl border-2 border-outline text-xl font-black text-text"
          type="button"
          onClick={onBack}
        >
          Back
        </button>
        <button
          className="h-16 rounded-3xl bg-primary text-xl font-black text-on-primary disabled:opacity-70"
          type="button"
          onClick={onNext}
          disabled={saving}
        >
          {saving ? "Saving" : isLastStep ? "Done" : "Next"}
        </button>
      </div>
    </section>
  );
}

function DoneScreen({ action, onRestart }) {
  return (
    <section className="flex flex-1 flex-col justify-center gap-8 text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-success text-black">
        <Check size={56} strokeWidth={4} />
      </div>
      <div>
        <p className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">{action}</p>
        <h1 className="text-5xl font-black leading-tight">Done</h1>
      </div>
      <button
        className="h-16 rounded-3xl bg-primary text-xl font-black text-on-primary"
        type="button"
        onClick={onRestart}
      >
        Scan Again
      </button>
    </section>
  );
}

export default App;
