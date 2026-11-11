import { useReveal } from "./hooks";
import BackgroundEffects from "./BackgroundEffects";
import ContactSection from "./ContactSection";
import FaqSection from "./FaqSection";
import HeroSection from "./HeroSection";
import LearningRoadmap from "./LearningRoadmap";
import MentorIntroduction from "./MentorIntroduction";
import MentorshipFooter from "./MentorshipFooter";
import MentorshipNavbar from "./MentorshipNavbar";
import MentorshipProgram from "./MentorshipProgram";
import ProjectGallery from "./ProjectGallery";
import SessionGallery from "./SessionGallery";
import SessionOffers from "./SessionOffers";
import TechnologyStack from "./TechnologyStack";
import TestimonialSection from "./TestimonialSection";
import "./mentorship.css";

/**
 * The mentorship page.
 *
 * Composes the section components into one page and owns the two things
 * they all share: the `.ms-page` scope that carries the design tokens, and
 * the reveal observer that fades sections in as they scroll into view.
 */
export default function MentorshipPage() {
  const revealRef = useReveal();

  return (
    <div className="ms-page" ref={revealRef}>
      <BackgroundEffects />
      <MentorshipNavbar />

      <main id="top">
        <HeroSection />
        <MentorIntroduction />
        <SessionGallery />
        <LearningRoadmap />
        <ProjectGallery />
        <MentorshipProgram />
        <SessionOffers />
        <TechnologyStack />
        <TestimonialSection />
        <FaqSection />
        <ContactSection />
      </main>

      <MentorshipFooter />
    </div>
  );
}
