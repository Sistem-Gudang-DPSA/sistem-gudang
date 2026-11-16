import { useId, useState } from "react";
import type { InputHTMLAttributes } from "react";

export type JumlahInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  warning?: string;
  validate: (value: string) => string;
};

const PESAN_KARAKTER = "Gunakan angka saja dan koma (,) untuk desimal. Huruf dan titik tidak diperbolehkan.";

// Form menyimpan titik untuk perhitungan/API; kolom selalu menampilkan koma.
export default function JumlahInput({ value, onValueChange, warning, validate, className, ...props }: JumlahInputProps) {
  const warningId = useId();
  const [rejected, setRejected] = useState("");
  const message = rejected || warning || validate(value);

  return (
    <div className="min-w-0">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
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
          onValueChange(next.replace(/,/g, "."));
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
