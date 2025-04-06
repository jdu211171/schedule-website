import React from 'react'
import TabsNav from './tabs-nav'

export default function MasterLayout({children}: { children: React.ReactNode }) {
    return (
        <div className="container mx-auto py-6">
            <TabsNav/>
            <div className="mt-6">
                {children}
            </div>
        </div>
    )
}
