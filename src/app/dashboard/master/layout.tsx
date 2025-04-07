export default function MasterLayout({children}: { children: React.ReactNode }) {
    return (
        <div className="container mx-auto py-6">
            {children}
        </div>
    )
}
