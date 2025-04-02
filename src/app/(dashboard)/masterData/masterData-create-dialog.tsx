"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MasterDataCreateDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDataCreated: (data: Record<string, string>) => void;
    columns?: Record<string, string>;
};

export function MasterDataCreateDialog({ open, onOpenChange, onDataCreated, columns }: MasterDataCreateDialogProps) {
    const [formData, setFormData] = useState<Record<string, string>>({});

    useEffect(() => {
        console.log("MasterDataCreateDialog の columns:", columns);

        if (columns && typeof columns === "object") {
            const defaultData = Object.keys(columns).reduce((acc, key) => ({ ...acc, [key]: "" }), {});
            setFormData(defaultData);
        }
    }, [columns, open]);

    const handleChange = (key: string, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onDataCreated({ ...formData });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>新規データを追加</DialogTitle>
                    <DialogDescription>新しいデータの情報を入力してください。</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {columns && typeof columns === "object" ? (
                            Object.entries(columns).map(([key, label]) => (
                                <div key={key} className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor={key} className="text-right">
                                        {label}
                                    </Label>
                                    <Input
                                        id={key}
                                        value={formData[key] || ""}
                                        onChange={(e) => handleChange(key, e.target.value)}
                                        required
                                        className="col-span-3"
                                    />
                                </div>
                            ))
                        ) : (
                            <p className="text-red-500">エラー: カラムが設定されていないか、フォーマットが無効です。</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={!columns || Object.keys(columns).length === 0}>
                            作成
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
