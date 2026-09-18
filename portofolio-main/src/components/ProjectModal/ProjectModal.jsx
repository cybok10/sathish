import { useEffect, useState } from "react";
import { FiGithub, FiX } from "react-icons/fi";

const ProjectModal = ({ isOpen, onClose, project }) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleClose = () => {
    setIsClosing(true);
    window.setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  };

  if (!isOpen || !project) return null;

  return (
    <div className="project-modal-backdrop" onClick={handleClose} role="presentation">
      <div
        className={`project-modal ${isClosing ? "project-modal--closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-modal-image">
          <img src={project.image} alt={project.title} />
          <button type="button" onClick={handleClose} aria-label="Close project details">
            <FiX size={21} />
          </button>
        </div>

        <div className="project-modal-body">
          <span>PROJECT / SECURITY BUILD</span>
          <h2 id="project-modal-title">{project.title}</h2>
          <p>{project.fullDescription}</p>

          {project.url && project.url !== "#contact" ? (
            <a href={project.url} target="_blank" rel="noreferrer" className="project-modal-link">
              <FiGithub />
              Source code
            </a>
          ) : (
            <a href="/portofolio/#contact" className="project-modal-link">
              Discuss this project <span>↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
