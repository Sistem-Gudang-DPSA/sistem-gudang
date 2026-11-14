import { useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { inputJumlah, JUMLAH_INPUT, peringatanJumlah } from "../form-utils";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  warning?: string;
};

const PESAN_KARAKTER = "Gunakan angka saja dan koma (,) untuk desimal. Huruf dan titik tidak diperbolehkan.";

// Form menyimpan titik untuk perhitungan/API; kolom selalu menampilkan koma.
export default function JumlahPengambilanInput({ value, onValueChange, warning, className, ...props }: Props) {
  const warningId = useId();
  const [rejected, setRejected] = useState("");
  const message = rejected || warning || peringatanJumlah(value);

  return (
    <div className="min-w-0">
      <input
        {...JUMLAH_INPUT}
        {...props}
        value={value.replace(/\./g, ",")}
        aria-invalid={!!message}
        aria-describedby={message ? warningId : undefined}
        onKeyDown={(event) => {
          if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
          if (/[^\d,]/.test(event.key)) {
            event.preventDefault();
            setRejected(PESAN_KARAKTER);
          } else {
            setRejected("");
          }
        }}
        onPaste={(event) => {
          if (/[^\d,]/.test(event.clipboardData.getData("text"))) {
            event.preventDefault();
            setRejected(PESAN_KARAKTER);
          }
        }}
        onChange={(event) => {
          const next = event.target.value;
          if (/[^\d,]/.test(next)) {
            setRejected(PESAN_KARAKTER);
            return;
          }
          if (!/^\d*(?:,\d{0,3})?$/.test(next)) {
            setRejected("Gunakan satu koma dan maksimal 3 angka di belakang koma.");
            return;
          }
          setRejected("");
          onValueChange(inputJumlah(next));
        }}
        className={`${className ?? ""} ${message ? "border-red-400 bg-red-50" : ""}`}
      />
      {message && (
        <p id={warningId} role="alert" className="mt-1 max-w-60 text-xs text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}
