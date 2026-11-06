"use client";

import React, { useState, useEffect } from 'react';
import { Pencil, Lock } from 'lucide-react';

export interface EditTimerProps {
    initialSeconds?: number;
    deadline?: number | Date;
    onEditClick: () => void;
    ariaLabel?: string;
    title?: string;
    disabled?: boolean;
}

const EditTimerButton: React.FC<EditTimerProps> = ({
    initialSeconds,
    deadline,
    onEditClick,
    ariaLabel,
    title,
    disabled = false,
}) => {
    // Sisa waktu dihitung dari jam saat render; state hanya menyimpan "sekarang" yang diperbarui tiap detik
    const [mulai] = useState(() => Date.now());
    const [now, setNow] = useState(mulai);
    const target = deadline !== undefined
        ? (typeof deadline === 'number' ? deadline : new Date(deadline).getTime())
        : mulai + (initialSeconds ?? 0) * 1000;
    const secondsLeft = Math.max(0, Math.floor((target - now) / 1000));

    useEffect(() => {
        if (target <= Date.now()) return;
        const timerId = setInterval(() => {
            const t = Date.now();
            setNow(t);
            if (t >= target) clearInterval(timerId);
        }, 1000);
        return () => clearInterval(timerId);
    }, [target]);

    const isTimeUp = secondsLeft <= 0 || disabled;

    const formatTime = (timeInSeconds: number): string => {
        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = timeInSeconds % 60;
        const pad = (n: number) => String(n).padStart(2, '0');

        if (hours > 0) {
            return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }
        return `${pad(minutes)}:${pad(seconds)}`;
    };

    const getAriaLabel = () => {
        if (ariaLabel) {
            if (isTimeUp && !ariaLabel.includes('(terkunci)')) {
                return `${ariaLabel} (terkunci)`;
            }
            return ariaLabel;
        }
        return isTimeUp ? 'Edit (terkunci)' : 'Edit';
    };

    const getTitle = () => {
        if (title) return title;
        return isTimeUp
            ? 'Sudah lewat 1 hari, tidak bisa diedit'
            : `Sisa waktu edit: ${formatTime(secondsLeft)}`;
    };

    return (
        <div className="inline-flex flex-col items-center gap-0.5">
            <button
                type="button"
                onClick={onEditClick}
                disabled={isTimeUp} 
                title={getTitle()}
                aria-label={getAriaLabel()}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isTimeUp
                        ? 'border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-70' // <-- Tampilan disabled abu-abu
                        : 'border border-[#FF8A00] text-[#FF8A00] hover:bg-orange-50 cursor-pointer'
                    }`}
            >
                {isTimeUp ? <Lock className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                <span>Edit</span> {/* <-- Teks tetap Edit */}
            </button>

            {!isTimeUp ? (
                <div className="text-[10px] text-red-500 font-mono font-medium whitespace-nowrap">
                    <span className="text-gray-400 mr-1">Sisa Waktu :</span>
                    <span className="font-semibold">{formatTime(secondsLeft)}</span>
                </div>
            ) : (
                <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                    Waktu habis
                </span>
            )}
        </div>
    );
};

export default EditTimerButton;
