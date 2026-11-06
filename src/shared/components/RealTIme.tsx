import React, { useState, useEffect } from 'react';

const RealTimeClock: React.FC = () => {
  // 1. Buat state untuk menyimpan string waktu saat ini
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    // Fungsi untuk mengambil waktu terbaru dengan format id-ID
    const updateTime = () => {
      const timeString = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setCurrentTime(timeString);
    };

    // Jalankan pertama kali saat komponen dimuat
    updateTime();

    // 2. Setel interval agar waktu diperbarui setiap 1000 ms (1 detik)
    const timerId = setInterval(updateTime, 1000);

    // Bersihkan interval saat komponen tidak lagi digunakan (unmount)
    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="text-sm font-semibold font-mono text-gray-700">
      {/* 3. Tampilkan state waktu yang terus berjalan */}
      Waktu Sekarang: {currentTime}
    </div>
  );
};

export default RealTimeClock;
