import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 6);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, gotra, gender, birthdate, age, tshirtSize, distance } = body;

        // Ensure unique ID (though collision probability is low for 6 chars, it's non-zero)
        let id = nanoid();
        let exists = await prisma.user.findUnique({ where: { id } });
        while (exists) {
            id = nanoid();
            exists = await prisma.user.findUnique({ where: { id } });
        }

        const user = await prisma.user.create({
            data: {
                id,
                name,
                gotra,
                gender,
                birthdate: new Date(birthdate),
                age: parseInt(age),
                tshirtSize,
                distance,
            },
        });

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 });
    }
}
