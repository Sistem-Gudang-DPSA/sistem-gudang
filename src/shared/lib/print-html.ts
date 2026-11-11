// Iframe tersembunyi: tidak diblokir pop-up, dan menu serta tombol halaman tidak ikut tercetak.
// siapkan (opsional) dijalankan di dokumen iframe sebelum print, mis. untuk menunggu gambar.
export function cetakHtml(
  html: string,
  label: string,
  siapkan?: (dokumen: Document) => Promise<void>,
): Promise<void> {
  const iframe = document.createElement("iframe");
  iframe.title = `Cetak ${label}`;
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";

  return new Promise((resolve, reject) => {
    iframe.onload = async () => {
      const printWindow = iframe.contentWindow;
      const printDocument = iframe.contentDocument;
      if (!printWindow || !printDocument) {
        iframe.remove();
        reject(new Error("Dokumen cetak tidak dapat dibuka."));
        return;
      }
      printWindow.addEventListener("afterprint", () => iframe.remove(), { once: true });
      try {
        await siapkan?.(printDocument);
        printWindow.focus();
        printWindow.print();
        resolve();
      } catch (err) {
        iframe.remove();
        reject(err);
      }
    };
    iframe.onerror = () => {
      iframe.remove();
      reject(new Error("Dokumen cetak gagal dimuat."));
    };

    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });
}
