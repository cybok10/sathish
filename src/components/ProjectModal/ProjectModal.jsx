import React, { useState, useEffect } from 'react';
import { FiX, FiGithub } from 'react-icons/fi'; // Install react-icons jika belum: npm install react-icons

const ProjectModal = ({ isOpen, onClose, project }) => {
  // State untuk mengontrol animasi penutupan
  const [isClosing, setIsClosing] = useState(false);

  // Fungsi untuk menangani penutupan dengan animasi
  const handleClose = () => {
    setIsClosing(true);
    // Tunggu animasi selesai (300ms) sebelum memanggil onClose dari props
    setTimeout(() => {
      onClose();
      setIsClosing(false); // Reset state untuk pembukaan berikutnya
    }, 300);
  };

  // Mencegah scroll di background saat modal terbuka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    // Cleanup function
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);


  if (!isOpen) return null;

  return (
    // Overlay
    <div
      onClick={handleClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity duration-300"
    >
      {/* Modal Content */}
      <div
        onClick={(e) => e.stopPropagation()} // Mencegah modal tertutup saat diklik di dalam
        className={`bg-[var(--pf-surface)] border border-[var(--pf-line-strong)] rounded-2xl shadow-2xl shadow-black/60 w-full max-w-lg transform transition-transform duration-300 ${isClosing ? 'animate-out' : 'animate-in'}`}
      >
        {/* --- GAMBAR PROYEK --- */}
        <img 
          src={project.image} 
          alt={project.title} 
          className="w-full h-56 object-cover rounded-t-2xl"
        />

        <div className="p-6 flex flex-col gap-4">
            <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold text-white">{project.title}</h2>
                <button
                    onClick={handleClose}
                    className="text-[var(--pf-dim)] hover:text-white transition-colors p-2 rounded-full hover:bg-[var(--pf-surface-2)] -mt-2 -mr-2"
                    aria-label="Close"
                >
                    <FiX size={24} />
                </button>
            </div>

            {/* --- DESKRIPSI LENGKAP --- */}
            {project.subtitle ? (
              <p className="text-[var(--pf-accent-2)] font-mono text-xs -mt-2">{project.subtitle}</p>
            ) : null}

            {/* --- DESKRIPSI LENGKAP --- */}
            <p className="text-[var(--pf-muted)] text-base leading-relaxed">
                {project.fullDescription}
            </p>

            {project.tags?.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <li
                    key={tag}
                    className="font-mono text-[0.68rem] px-2 py-1 rounded border border-[var(--pf-line)] bg-[var(--pf-surface-2)] text-[var(--pf-muted)]"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}

            <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center gap-2 font-semibold bg-[var(--pf-accent)] text-[var(--pf-bg)] p-3 px-5 rounded-full w-full cursor-pointer border border-transparent hover:bg-[var(--pf-accent-dim)] transition-colors"
            >
                <FiGithub />
                <span>Source Code</span>
            </a>
        </div>
      </div>
       {/* CSS untuk animasi */}
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-in {
          animation: scaleIn 0.3s ease-out forwards;
        }
        
        @keyframes scaleOut {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.95); opacity: 0; }
        }
        .animate-out {
          animation: scaleOut 0.3s ease-in forwards;
        }
      `}</style>
    </div>
  );
};

export default ProjectModal;
