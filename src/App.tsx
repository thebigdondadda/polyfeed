import { useEffect, useState } from "react";
import { AuthPage } from "./components/AuthPage";
import { Dashboard } from "./components/Dashboard";
import { Landing } from "./components/Landing";
import { LegalPage } from "./components/LegalPage";
import { useAuth } from "./hooks/useAuth";
import { DOC_PAGES, pageFromHash, type LegalPageId } from "./lib/pages";

export default function App() {
  const auth = useAuth();
  const [page, setPage] = useState(() => pageFromHash(window.location.hash));

  useEffect(() => {
    const sync = () => setPage(pageFromHash(window.location.hash));
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (auth.signedIn && (page === "signin" || page === "signup")) {
      window.location.hash = "home";
    }
  }, [auth.signedIn, page]);

  const goHome = () => {
    if (window.location.hash && window.location.hash !== "#home") {
      window.location.hash = "home";
    }
  };

  if ((DOC_PAGES as readonly string[]).includes(page)) {
    return (
      <LegalPage
        page={page as LegalPageId}
        signedIn={auth.signedIn}
        onBack={goHome}
      />
    );
  }

  if (page === "signin" || page === "signup") {
    return (
      <AuthPage
        mode={page}
        configured={auth.configured}
        onSignIn={auth.signIn}
        onSignUp={async (email, password, username) => Boolean(await auth.signUp(email, password, username))}
        onGoogle={auth.signInWithGoogle}
      />
    );
  }

  if (!auth.signedIn) {
    return <Landing />;
  }

  return <Dashboard onSignOut={() => void auth.signOut()} />;
}
