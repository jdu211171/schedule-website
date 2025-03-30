"use client";

import React, { useState } from "react";
import Table from "./Table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { masterData as initialData, columnMaps } from "./data";
import { MasterDataCreateDialog } from "./masterData-create-dialog";
import { MasterDataEditDialog } from "./masterData-edit-dialog";
import { MasterDataDeleteDialog } from "./masterData-delete-dialog";

type MasterDataItem = {
    id: number;
    [key: string]: any;
};

export default function MasterDataPage() {
    const [data, setData] = useState(initialData);
    const [selectedTab, setSelectedTab] = useState<keyof typeof initialData>("student-type");

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const [selectedItem, setSelectedItem] = useState<MasterDataItem | null>(null);

    const handleCreate = () => {
        setSelectedItem(null);
        setIsCreateOpen(true);
    };

    const handleEdit = (item: MasterDataItem) => {
        setSelectedItem(item);
        setIsEditOpen(true);
    };

    const handleDelete = (item: MasterDataItem) => {
        setSelectedItem(item);
        setIsDeleteOpen(true);
    };

    const handleSaveCreate = (newItem: MasterDataItem) => {
        setData((prev) => ({
            ...prev,
            [selectedTab]: [...prev[selectedTab], { ...newItem, id: newItem.id || Date.now() }]
        }));
        setIsCreateOpen(false);
    };

    const handleSaveEdit = (updatedItem: MasterDataItem) => {
        setData((prev) => ({
            ...prev,
            [selectedTab]: prev[selectedTab].map((item) => (item.id === updatedItem.id ? updatedItem : item))
        }));
        setIsEditOpen(false);
    };

    const handleConfirmDelete = (id: number) => {
        if (id === undefined) {
            console.error("Ошибка: ID не определён!");
            return;
        }
        setData((prev) => ({
            ...prev,
            [selectedTab]: prev[selectedTab].filter((item) => item.id !== id)
        }));
        setIsDeleteOpen(false);
    };

    return (
        <div className="p-6">
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="mb-6">
                    {Object.keys(initialData).map((tab) => (
                        <TabsTrigger key={tab} value={tab}>
                            {columnMaps[tab]?.name || tab}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {Object.keys(initialData).map((tab) => (
                    <TabsContent key={tab} value={tab}>
                        <div className="flex justify-between items-center mb-4">
                            <h1 className="text-2xl font-bold">{columnMaps[tab]?.name || "データ"}</h1>
                            <Button variant="default" onClick={handleCreate}>+ 新規作成</Button>
                        </div>
                        <Table
                            data={data[tab]}
                            columns={columnMaps[tab]}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    </TabsContent>
                ))}
            </Tabs>

            <MasterDataCreateDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onDataCreated={handleSaveCreate}
                columns={columnMaps[selectedTab]}
            />

            {selectedItem && columnMaps[selectedTab] && (
                <MasterDataEditDialog
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    data={selectedItem}
                    onDataUpdated={handleSaveEdit}
                    columns={columnMaps[selectedTab]}
                />
            )}

            {selectedItem && columnMaps[selectedTab] && (
                <MasterDataDeleteDialog
                    open={isDeleteOpen}
                    onOpenChange={setIsDeleteOpen}
                    data={selectedItem}
                    onDataDeleted={handleConfirmDelete}
                    columns={columnMaps[selectedTab]}
                />
            )}
        </div>
    );
}
