import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { columnMaps } from "./data";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    activeTab: string;
    initialData?: any;
}

export default function Modal({ isOpen, onClose, onSave, activeTab, initialData }: ModalProps) {
    const columns = columnMaps[activeTab] || {};
    const [form, setForm] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            setForm(
                Object.keys(columns).reduce((acc, key) => {
                    acc[key] = initialData ? initialData[key] ?? "" : "";
                    return acc;
                }, {} as Record<string, string>)
            );
        }
    }, [isOpen, initialData, activeTab]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white bg-opacity-90 backdrop-blur p-6 rounded-lg shadow-lg w-96">
                <h2 className="text-lg font-semibold mb-4">{initialData ? "編集" : "新規作成"}</h2>
                {Object.entries(columns).map(([key, label]) => (
                    <input
                        key={key}
                        type="text"
                        placeholder={label as string}
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
