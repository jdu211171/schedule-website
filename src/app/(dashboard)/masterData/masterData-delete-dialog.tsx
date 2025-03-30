"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type MasterData = Record<string, any>;

type MasterDataDeleteDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: MasterData | null;
    columns?: Record<string, string>;
    onDataDeleted: (id: number) => void;
};

export function MasterDataDeleteDialog({ open, onOpenChange, data, columns, onDataDeleted }: MasterDataDeleteDialogProps) {
    const [validatedColumns, setValidatedColumns] = useState<Record<string, string> | null>(null);

    useEffect(() => {
        console.log("MasterDataDeleteDialog の columns:", columns);
        console.log("MasterDataDeleteDialog の data:", data);

        if (columns && typeof columns === "object" && Object.keys(columns).length > 0) {
            setValidatedColumns(columns);
        } else {
            setValidatedColumns(null);
        }
    }, [columns, open]);

    const handleDelete = () => {
        console.log("handleDelete の data:", data);
        if (!data || typeof data.id === "undefined") {
            console.error("エラー: ID が定義されていません!");
            return;
        }
        console.log("削除する ID:", data.id);
        onDataDeleted(data.id);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>データを削除</DialogTitle>
                    <DialogDescription>本当に削除しますか？この操作は取り消せません。</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {validatedColumns && data ? (
                        <div className="border rounded-md p-4 bg-gray-50">
                            {Object.entries(validatedColumns).map(([key, label]) => (
                                <div key={key} className="flex justify-between">
                                    <span className="font-medium">{label}:</span>
                                    <span className="text-gray-500">{data[key] || "—"}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-red-500">エラー: カラムが設定されていないか、データがありません。</p>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                        キャンセル
                    </Button>
                    <Button type="button" variant="destructive" onClick={handleDelete} disabled={!data}>
                        削除
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}