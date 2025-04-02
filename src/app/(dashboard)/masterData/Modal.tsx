import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { columnMaps } from "./data";

type MasterDataItem =
    | { id: number; name: string; note?: string }
    | { id: number; name: string; type: string; level: number; note?: string }
    | { id: number; name: string; score: number; note?: string }
    | { id: number; startTime: string; endTime: string; note?: string }
    | { id: number; name: string; capacity: number; note?: string }
    | { id: number; name: string; typeName: string; typeId: number; note?: string }
    | { id: number; name: string; subject: string; year: string; duration: string; lessons: number; category: string; note?: string };

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Record<string, string>) => void;
    activeTab: keyof typeof columnMaps;
    initialData?: MasterDataItem;
}

export default function Modal({ isOpen, onClose, onSave, activeTab, initialData }: ModalProps) {
    const columns = useMemo(() => columnMaps[activeTab] || {}, [activeTab]);
    const [form, setForm] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen && initialData) {
            setForm(
                Object.keys(columns).reduce((acc, key) => {
                    acc[key] = key in initialData && initialData[key as keyof MasterDataItem] !== undefined ? String(initialData[key as keyof MasterDataItem]) : "";
                    return acc;
                }, {} as Record<string, string>)
            );
        } else if (isOpen) {
            setForm(
                Object.keys(columns).reduce((acc, key) => {
                    acc[key] = "";
                    return acc;
                }, {} as Record<string, string>)
            );
        }
    }, [isOpen, initialData, columns]); // Обновляем зависимости

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white bg-opacity-90 backdrop-blur p-6 rounded-lg shadow-lg w-96">
                <h2 className="text-lg font-semibold mb-4">{initialData ? "編集" : "新規作成"}</h2>
                {Object.entries(columns).map(([key, label]) => (
                    <input
                        key={key}
                        type="text"
                        placeholder={label}
                        value={form[key] || ""}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className="w-full border rounded px-3 py-2 mb-2 bg-gray-100"
                    />
                ))}
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onClose}>キャンセル</Button>
                    <Button variant="default" onClick={() => { onSave(form); onClose(); }}>
                        {initialData ? "更新" : "追加"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
