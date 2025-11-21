import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, ArrowRight, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { adminEmails } from "@/config/admins.js";
import logoImg from "@/assets/logo.png";

const GOOGLE_USERINFO_ENDPOINT =
  "https://www.googleapis.com/oauth2/v3/userinfo";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleEmailSignIn = (event) => {
    event.preventDefault();
    setIsEmailSubmitting(true);
    setTimeout(() => {
      setError(
        "Autentificarea cu email/parolă nu este disponibilă încă. Folosește Conectare cu Google."
      );
      setIsEmailSubmitting(false);
    }, 800);
  };

  const googleLogin = useGoogleLogin({
    flow: "implicit",
    onSuccess: async (tokenResponse) => {
      try {
        const profileResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });
        if (!profileResponse.ok) {
          throw new Error("Nu am putut obține datele profilului Google.");
        }
        const profile = await profileResponse.json();
        const normalizedEmail = profile.email?.toLowerCase();
        const isAllowed =
          normalizedEmail &&
          adminEmails.some((admin) => admin.toLowerCase() === normalizedEmail);

        if (!isAllowed) {
          setError("Accesul este permis doar administratorilor autorizați.");
          return;
        }
        login({
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
          provider: "google",
        });
        navigate("/", { replace: true });
      } catch (fetchError) {
        console.error(fetchError);
        setError("Conectarea cu Google a eșuat. Încearcă din nou.");
      }
    },
    onError: (authError) => {
      console.error(authError);
      setError("Google SSO a eșuat. Încearcă din nou.");
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 shadow-2xl shadow-slate-200">
        <div className="flex flex-col items-center space-y-2 text-center mb-6">
          <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center">
            <img
              src={logoImg}
              alt="Feedback Assistant"
              className="w-20 h-20 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome to Feedback Assistant
          </h1>
          <p className="text-sm text-slate-500">Sign in to continue</p>
        </div>

        <form className="space-y-4" onSubmit={handleEmailSignIn}>
          <label className="text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="pl-9 h-11 rounded-xl"
              required
            />
          </div>

          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="password"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pl-9 h-11 rounded-xl"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-base font-semibold bg-slate-900 hover:bg-slate-800"
            disabled={isEmailSubmitting}
          >
            {isEmailSubmitting ? "Checking..." : "Sign in"}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs uppercase tracking-wide text-slate-400">
            or
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <Button
          variant="outline"
          className="w-full h-12 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
          onClick={() => googleLogin()}
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="w-5 h-5 mr-2"
          />
          Continue with Google
        </Button>

        {error && (
          <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
        )}

        <div className="flex justify-between text-sm text-slate-500 mt-6">
          <button
            type="button"
            className="hover:text-slate-700 inline-flex items-center gap-1"
          >
            Forgot password?
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            className="hover:text-slate-700 inline-flex items-center gap-1"
          >
            Need an account? Sign up
          </button>
        </div>

        <Button
          variant="ghost"
          className="w-full mt-6 text-slate-500 hover:text-slate-700"
          onClick={() => navigate("/", { replace: true })}
        >
          <LogIn className="w-4 h-4 mr-2" />
          Back to app
        </Button>
      </Card>
    </div>
  );
}
