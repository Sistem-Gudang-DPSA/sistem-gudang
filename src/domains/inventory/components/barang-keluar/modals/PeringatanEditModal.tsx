import { createPortal } from "react-dom";
import { Lock } from "lucide-react";
import { orangeButtonClass } from "../styles";

// Peringatan data sudah tidak bisa diedit
export default function PeringatanEditModal({ pesan, onClose }: { pesan: string; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="peringatan-edit-judul"
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200"
      >
        <div className="mx-auto mb-4 w-12 h-12 flex items-center justify-center rounded-full bg-red-50 text-red-500">
          <Lock className="w-6 h-6" />
        </div>
        <h2 id="peringatan-edit-judul" className="text-base font-extrabold text-black mb-2">
          Tidak Bisa Diedit
        </h2>
        <p className="text-sm text-gray-600 mb-6">{pesan}</p>
        <button type="button" onClick={onClose} className={`${orangeButtonClass} w-full`}>
          Mengerti
        </button>
      </div>
    </div>,
    document.body,
  );
}
