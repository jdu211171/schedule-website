'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

export default function MasterDataPage() {
    const [grades, setGrades] = useState([
        { id: 'GRADE001', name: '小学1年生', type: '小学生', label: '1年生' },
        { id: 'GRADE002', name: '小学2年生', type: '小学生', label: '2年生' },
        { id: 'GRADE007', name: '中学1年生', type: '中学生', label: '1年生' },
    ])

    const [teachers, setTeachers] = useState([{ id: 1, name: '田中先生' }])
    const [subjects, setSubjects] = useState([{ id: 1, name: '数学' }])

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">マスターデータ</h1>
            <Tabs defaultValue="students" className="w-full">
                <TabsList>
                    <TabsTrigger value="teachers">教師</TabsTrigger>
                    <TabsTrigger value="students">生徒</TabsTrigger>
                    <TabsTrigger value="subjects">科目</TabsTrigger>
                </TabsList>

                <TabsContent value="teachers">
                    <EntityTable
                        data={teachers}
                        label="教師"
                        onAdd={(name) =>
                            setTeachers((prev) => [...prev, { id: Date.now(), name }])
                        }
                        onDelete={(id) => setTeachers((prev) => prev.filter((t) => t.id !== id))}
                    />
                </TabsContent>

                <TabsContent value="students">
                    <GradeTable
                        data={grades}
                        onAdd={(entry) => setGrades((prev) => [...prev, entry])}
                        onUpdate={(entry) =>
                            setGrades((prev) => prev.map((g) => (g.id === entry.id ? entry : g)))
                        }
                        onDelete={(id) => setGrades((prev) => prev.filter((g) => g.id !== id))}
                    />
                </TabsContent>

                <TabsContent value="subjects">
                    <EntityTable
                        data={subjects}
                        label="科目"
                        onAdd={(name) =>
                            setSubjects((prev) => [...prev, { id: Date.now(), name }])
                        }
                        onDelete={(id) => setSubjects((prev) => prev.filter((s) => s.id !== id))}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function EntityTable({ data, label, onAdd, onDelete }: any) {
    const [name, setName] = useState('')
    return (
        <div className="mt-4">
            <div className="flex space-x-2 mb-2">
                <Input
                    placeholder={`${label}の名前`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <Button onClick={() => name && onAdd(name)}>追加</Button>
            </div>
            <table className="w-full border border-gray-300 text-sm">
                <thead>
                <tr className="bg-gray-100">
                    <th className="border p-2">ID</th>
                    <th className="border p-2">名前</th>
                    <th className="border p-2">操作</th>
                </tr>
                </thead>
                <tbody>
                {data.map((item: any) => (
                    <tr key={item.id}>
                        <td className="border p-2">{item.id}</td>
                        <td className="border p-2">{item.name}</td>
                        <td className="border p-2">
                            <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)}>削除</Button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}

function GradeTable({ data, onAdd, onUpdate, onDelete }: any) {
    const gradeTypes = ['小学生', '中学生', '高校生', '大学生', '浪人生', '大人']
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState({ id: '', name: '', type: '', label: '' })

    const handleOpen = (entry: any = null) => {
        if (entry) {
            setEditing(true)
            setForm(entry)
        } else {
            setEditing(false)
            setForm({ id: '', name: '', type: '', label: '' })
        }
        setDialogOpen(true)
    }

    const handleSave = () => {
        if (editing) onUpdate(form)
        else onAdd(form)
        setDialogOpen(false)
    }

    return (
        <div className="mt-6">
            <div className="flex justify-end mb-4">
                <Button onClick={() => handleOpen()}>追加</Button>
            </div>

            <table className="w-full border border-gray-300 text-sm">
                <thead>
                <tr className="bg-gray-100">
                    <th className="border p-2">学年ID</th>
                    <th className="border p-2">学年名</th>
                    <th className="border p-2">学年タイプ名</th>
                    <th className="border p-2">学年</th>
                    <th className="border p-2">操作</th>
                </tr>
                </thead>
                <tbody>
                {data.map((g: any) => (
                    <tr key={g.id}>
                        <td className="border p-2">{g.id}</td>
                        <td className="border p-2">{g.name}</td>
                        <td className="border p-2">{g.type}</td>
                        <td className="border p-2">{g.label}</td>
                        <td className="border p-2 space-x-2">
                            <Button size="sm" onClick={() => handleOpen(g)}>編集</Button>
                            <Button size="sm" variant="destructive" onClick={() => onDelete(g.id)}>削除</Button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? '学年を編集' : '学年を追加'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>学年ID</Label>
                            <Input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} disabled={editing} />
                        </div>
                        <div>
                            <Label>学年名</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div>
                            <Label>学年タイプ名</Label>
                            <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="選択してください" />
                                </SelectTrigger>
                                <SelectContent>
                                    {gradeTypes.map((g) => (
                                        <SelectItem key={g} value={g}>{g}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>学年</Label>
                            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
                        </div>
                        <div className="text-right">
                            <Button onClick={handleSave}>{editing ? '保存' : '追加'}</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
