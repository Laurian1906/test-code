import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "@/App.jsx";
import "@/index.css";
import { AuthProvider } from "@/contexts/AuthContext.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId) {
  console.warn(
    "VITE_GOOGLE_CLIENT_ID is not set. Google Sign-In will not work until this is configured."
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={googleClientId || "missing-google-client-id"}>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </AuthProvider>
  </GoogleOAuthProvider>
);
