import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import PreLoader from "./components/PreLoader.jsx";
import MentorshipPage from "./components/MentorshipPage.jsx";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const currentPath = window.location.pathname.replace(/\/$/, "");
const isMentorshipPage = currentPath === `${basePath}/mentorship`;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PreLoader />
    <div className="container mx-auto px-6">
      <Navbar />
      {isMentorshipPage ? <MentorshipPage /> : <App />}
      <Footer />
    </div>
  </StrictMode>,
);
