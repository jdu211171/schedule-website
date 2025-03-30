import React from "react";
import { Edit, Trash } from "lucide-react";

interface ColumnConfig {
    label: string;
    type?: "text" | "select";
    options?: string[];
}

interface TableProps {
    data: any[];
    columns: { [key: string]: string | ColumnConfig };
    onEdit: (item: any) => void;
    onDelete: (id: number) => void;
}

export default class Table extends React.Component<TableProps> {
    render() {
        let { data, columns, onEdit, onDelete } = this.props;
        if (!data || data.length === 0) {
            return <p className="text-gray-500 text-center py-4">データがありません</p>;
        }

        const headers = Object.keys(columns);

        return (
            <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                    <tr className="bg-gray-100">
                        {headers.map((key) => (
                            <th key={key} className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">
                                {typeof columns[key] === "string" ? columns[key] : (columns[key] as ColumnConfig).label}
                            </th>
                        ))}
                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">操作</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.map((row, index) => (
                        <tr key={index} className="border border-gray-300 hover:bg-gray-50">
                            {headers.map((key) => (
                                <td key={key} className="border border-gray-300 px-4 py-2">
                                    {row[key] ?? "-"}
                                </td>
                            ))}
                            <td className="border border-gray-300 px-4 py-2 flex items-center space-x-3">
                                <button onClick={() => onEdit(row)} className="text-gray-500 hover:text-gray-700">
                                    <Edit size={18} />
                                </button>
                                <button onClick={() => onDelete(row.id)} className="text-red-500 hover:text-red-700">
                                    <Trash size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        );
    }
}
