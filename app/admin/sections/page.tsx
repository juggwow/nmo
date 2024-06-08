import prisma from "@/lib/prisma"
import AddUser from "./sections"

export default async function Page(){
    const sections = await prisma.section.findMany({
        select: {
            id: true,
            name: true,
            shortName: true
        }
    })
    return (
        <AddUser sections={sections} />
    )
    
}