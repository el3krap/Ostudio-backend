import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { getUserProfile } from "./services/userService";
import { logoutUser } from "./authService";

import Login from "./components/Login";
import Signup from "./components/Signup";
import AdminDashboard from "./components/AdminDashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import CoordinatorDashboard from "./components/CoordinatorDashboard";
import DesignerDashboard from "./components/DesignerDashboard";
import Dashboard from "./components/Dashboard";

const globalStyles = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html,
  body,
  #root {
    width: 100%;
    min-height: 100vh;
    background-color: #ffffff !important;
    color: #000000 !important;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    direction: ltr;
  }

  body {
    min-width: 320px;
  }

  .App {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .counter {
    font-size: 16px;
    padding: 5px 10px;
    border-radius: 5px;
    color: var(--accent);
    background: var(--accent-bg);
    border: 2px solid transparent;
    transition: border-color 0.3s;
    margin-bottom: 24px;
  }

  .counter:hover {
    border-color: var(--accent-border);
  }

  .counter:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .hero {
    position: relative;
  }

  .hero .base,
  .hero .framework,
  .hero .vite {
    inset-inline: 0;
    margin: 0 auto;
  }

  .hero .base {
    width: 170px;
    position: relative;
    z-index: 0;
  }

  .hero .framework,
  .hero .vite {
    position: absolute;
  }

  .hero .framework {
    z-index: 1;
    top: 34px;
    height: 28px;
    transform:
      perspective(2000px)
      rotateZ(300deg)
      rotateX(44deg)
      rotateY(39deg)
      scale(1.4);
  }

  .hero .vite {
    z-index: 0;
    top: 107px;
    height: 26px;
    width: auto;
    transform:
      perspective(2000px)
      rotateZ(300deg)
      rotateX(40deg)
      rotateY(39deg)
      scale(0.8);
  }

  #center {
    display: flex;
    flex-direction: column;
    gap: 25px;
    place-content: center;
    place-items: center;
    flex-grow: 1;
  }

  @media (max-width: 1024px) {
    #center {
      padding: 32px 20px 24px;
      gap: 18px;
    }
  }

  #next-steps {
    display: flex;
    border-top: 1px solid var(--border);
    text-align: left;
  }

  #next-steps > div {
    flex: 1 1 0;
    padding: 32px;
  }

  @media (max-width: 1024px) {
    #next-steps > div {
      padding: 24px 20px;
    }
  }

  #next-steps .icon {
    margin-bottom: 16px;
    width: 22px;
    height: 22px;
  }

  @media (max-width: 1024px) {
    #next-steps {
      flex-direction: column;
      text-align: center;
    }
  }

  #docs {
    border-right: 1px solid var(--border);
  }

  @media (max-width: 1024px) {
    #docs {
      border-right: none;
      border-bottom: 1px solid var(--border);
    }
  }

  #next-steps ul {
    list-style: none;
    padding: 0;
    display: flex;
    gap: 8px;
    margin: 32px 0 0;
  }

  #next-steps ul .logo {
    height: 18px;
  }

  #next-steps ul a {
    color: var(--text-h);
    font-size: 16px;
    border-radius: 6px;
    background: var(--social-bg);
    display: flex;
    padding: 6px 12px;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    transition: box-shadow 0.3s;
  }

  #next-steps ul a:hover {
    box-shadow: var(--shadow);
  }

  #next-steps ul a .button-icon {
    height: 18px;
    width: 18px;
  }

  @media (max-width: 1024px) {
    #next-steps ul {
      margin-top: 20px;
      flex-wrap: wrap;
      justify-content: center;
    }

    #next-steps ul li {
      flex: 1 1 calc(50% - 8px);
    }

    #next-steps ul a {
      width: 100%;
      justify-content: center;
      box-sizing: border-box;
    }
  }

  #spacer {
    height: 88px;
    border-top: 1px solid var(--border);
  }

  @media (max-width: 1024px) {
    #spacer {
      height: 48px;
    }
  }

  .ticks {
    position: relative;
    width: 100%;
  }

  .ticks::before,
  .ticks::after {
    content: '';
    position: absolute;
    top: -4.5px;
    border: 5px solid transparent;
  }

  .ticks::before {
    left: 0;
    border-left-color: var(--border);
  }

  .ticks::after {
    right: 0;
    border-right-color: var(--border);
  }
`;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authPage, setAuthPage] = useState("login");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (!firebaseUser) {
          setUser(null);
          localStorage.removeItem("ostudio_user");
          setLoading(false);
          return;
        }

        try {
          const profile = await getUserProfile(firebaseUser.uid);

          if (!profile || profile.status !== "active") {
            await logoutUser();
            setUser(null);
            setLoading(false);
            return;
          }

          const sessionUser = {
            ...profile,
            uid: firebaseUser.uid,
            id: firebaseUser.uid,
          };

          setUser(sessionUser);
          localStorage.setItem(
            "ostudio_user",
            JSON.stringify(sessionUser)
          );
        } catch (error) {
          console.error("Auth profile error:", error);

          await logoutUser();
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  let content;

  if (loading) {
    content = (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui",
        }}
      >
        Loading Ostudio...
      </div>
    );
  } else if (!user) {
    content =
      authPage === "login" ? (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onGoToSignup={() => setAuthPage("signup")}
        />
      ) : (
        <Signup
          onSignupSuccess={() => setAuthPage("login")}
          onGoToLogin={() => setAuthPage("login")}
        />
      );
  } else {
    switch (user.role) {
      case "admin":
        content = (
          <AdminDashboard
            user={user}
            onLogout={handleLogout}
          />
        );
        break;

      case "manager":
        content = (
          <ManagerDashboard
            user={user}
            onLogout={handleLogout}
          />
        );
        break;

      case "coordinator":
        content = (
          <CoordinatorDashboard
            user={user}
            onLogout={handleLogout}
          />
        );
        break;

      case "designer":
        content = (
          <DesignerDashboard
            user={user}
            onLogout={handleLogout}
          />
        );
        break;

      case "presenter":
        content = (
          <Dashboard
            user={user}
            onLogout={handleLogout}
          />
        );
        break;

      default:
        content = (
          <Dashboard
            user={user}
            onLogout={handleLogout}
          />
        );
        break;
    }
  }

  return (
    <>
      <style>{globalStyles}</style>
      <div className="App">
        {content}
      </div>
    </>
  );
}

export default App;