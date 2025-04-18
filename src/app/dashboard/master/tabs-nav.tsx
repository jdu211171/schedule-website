'use client'

import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'

const tabs = [
    { name: 'ブース', href: '/dashboard/master/booths' },
    { name: 'クラス', href: '/dashboard/master/class' },
    { name: '評価', href: '/dashboard/master/evaluation' },
    { name: '学年', href: '/dashboard/master/grade' },
    { name: '学生', href: '/dashboard/master/student' },
    { name: '科目', href: '/dashboard/master/subject' },
    { name: '科目タイプ', href: '/dashboard/master/subject-type' },
    { name: '学生タイプ', href: '/dashboard/master/student-type' },
    { name: '講師', href: '/dashboard/master/teacher' },
    { name: '講師科目', href: '/dashboard/master/teacher-subjects' },
]

export default function TabsNav() {
    const pathname = usePathname()

    return (
        <Tabs value={pathname}>
            <TabsList className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                    <TabsTrigger
                        key={tab.href}
                        value={tab.href}
                        asChild
                        className={cn(
                            pathname === tab.href && 'bg-muted text-foreground',
                            'rounded-lg px-4 py-2'
                        )}
                    >
                        <Link href={tab.href}>{tab.name}</Link>
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    )
}
