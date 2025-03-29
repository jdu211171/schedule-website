import { hashSync } from "bcrypt-edge";
import prisma from "./prisma";


// **Users**
const hashedPassword = hashSync('password123', 10);
const users = [
    {
        id: 'ADMIN01',
        email: 'admin@example.com',
        username: 'admin',
        passwordHash: hashedPassword,
        role: 'admin',
    },
    {
        id: 'ADMIN02',
        email: 'teacher1@example.com',
        username: 'teacher1',
        passwordHash: hashedPassword,
        role: 'teacher',
    },
    {
        id: 'ADMIN03',
        email: 'student1@example.com',
        username: 'student1',
        passwordHash: hashedPassword,
        role: 'student',
    },
];
for (const user of users) {
    await prisma.user.create({
        data: user,
    });
}