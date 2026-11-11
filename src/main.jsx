import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import PreLoader from './components/PreLoader.jsx'
import MentorshipPage from './components/mentorship/MentorshipPage.jsx'
import BlogApp from './blog/BlogApp.jsx'
import "animate.css"
import AOS from 'aos';
import 'aos/dist/aos.css'; // You can also use <link> for styles
// ..
AOS.init();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const isMentorshipPage = window.location.pathname.replace(/\/$/, '') === `${basePath}/mentorship`;
const isBlogPage = new RegExp(`^${basePath}/(blog|admin)(/|$)`).test(window.location.pathname);

if (isMentorshipPage) {
  document.title = "Cybersecurity Mentorship | Sathish M";
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute(
      "content",
      "1:1 cybersecurity mentorship — structured learning tracks, practical labs in authorised environments, and career direction. Book a scoping call with Sathish M."
    );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isBlogPage ? (
      <BlogApp />
    ) : isMentorshipPage ? (
      // The mentorship page is full-bleed: it manages its own navigation,
      // footer and page scope, so it sits outside the shared container.
      <MentorshipPage />
    ) : (
      <>
        <PreLoader/>
        <div className = "container mx-auto px-6">
          <Navbar />
          <App />
          <Footer/>
        </div>
      </>
    )}
  </StrictMode>,
)
