'use client'

import Link from 'next/link'
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {cn} from '@/lib/utils'
import {usePathname} from 'next/navigation'

const tabs = [
    {name: 'Booths', href: '/dashboard/master/booths'},
    {name: 'Class', href: '/dashboard/master/class'},
    {name: 'Evaluation', href: '/dashboard/master/evaluation'},
    {name: 'Grade', href: '/dashboard/master/grade'},
    {name: 'Student', href: '/dashboard/master/student'},
    {name: 'Subject Type', href: '/dashboard/master/subject-type'},
    {name: 'Subject', href: '/dashboard/master/subject'},
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
