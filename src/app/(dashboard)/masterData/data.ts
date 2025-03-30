export const masterData = {
    "student-type": [
        { id: 1, name: "一般学生", note: "通常の学生" },
        { id: 2, name: "特別学生", note: "特別なケース" }
    ],
    "subject-type": [
        { id: 1, name: "数学", note: "数学関連科目" },
        { id: 2, name: "理科", note: "理科関連科目" }
    ],
    "year": [
        { id: 1, name: "1年", type: "初級", level: 1, note: "" },
        { id: 2, name: "2年", type: "中級", level: 2, note: "" }
    ],
    "lesson-type": [
        { id: 1, name: "通常授業", note: "" },
        { id: 2, name: "特別授業", note: "集中講座" }
    ],
    "rating": [
        { id: 1, name: "優", score: 5, note: "" },
        { id: 2, name: "良", score: 4, note: "" }
    ],
    "time-slot": [
        { id: 1, startTime: "09:00", endTime: "10:30", note: "" },
        { id: 2, startTime: "10:45", endTime: "12:15", note: "" }
    ],
    "booth": [
        { id: 1, name: "A-101", capacity: 10, note: "" },
        { id: 2, name: "B-202", capacity: 15, note: "" }
    ],
    "subject": [
        { id: 1, name: "代数", typeName: "数学", typeId: 1, note: "" },
        { id: 2, name: "物理", typeName: "理科", typeId: 2, note: "" }
    ],
    "course": [
        { id: 1, name: "数学基礎", subject: "数学", year: "1年", duration: "90分", lessons: 10, category: "通常", note: "" },
        { id: 2, name: "物理応用", subject: "物理", year: "2年", duration: "120分", lessons: 12, category: "特別", note: "" }
    ]
};

export const columnMaps = {
    "student-type": {
        id: "ID",
        name: "学生タイプ",
        note: "備考"
    },
    "subject-type": {
        id: "ID",
        name: "科目タイプ",
        note: "備考"
    },
    "year": {
        id: "ID",
        name: "学年",
        type: "種類",
        level: "レベル",
        note: "備考"
    },
    "lesson-type": {
        id: "ID",
        name: "授業種別",
        note: "備考"
    },
    "rating": {
        id: "ID",
        name: "評価",
        score: "スコア",
        note: "備考"
    },
    "time-slot": {
        id: "ID",
        name: "時間枠",
        startTime: "開始時間",
        endTime: "終了時間",
        note: "備考"
    },
    "booth": {
        id: "ID",
        name: "ブース",
        capacity: "収容人数",
        note: "備考"
    },
    "subject": {
        id: "ID",
        name: "科目",
        typeName: "科目タイプ",
        typeId: "科目タイプID",
        note: "備考"
    },
    "course": {
        id: "ID",
        name: "講座",
        subject: "科目",
        year: "学年",
        duration: "時間",
        lessons: "授業数",
        category: "カテゴリ",
        note: "備考"
    }
};
