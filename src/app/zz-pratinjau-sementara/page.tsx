import PenawaranHarga from "@/domains/ppic/components/PenawaranHarga";

// SEMENTARA: pratinjau tanpa login untuk tangkapan layar. Hapus setelah selesai.
export default function Page() {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50 min-h-screen">
      <div className="flex-1 p-6 md:p-8">
        <PenawaranHarga />
      </div>
    </div>
  );
}
