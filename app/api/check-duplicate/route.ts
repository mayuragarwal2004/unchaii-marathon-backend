import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { firstName, lastName, phoneNumber } = body;

        if (!firstName || !lastName || !phoneNumber) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const user = await prisma.user.findFirst({
            where: {
                firstName: { equals: firstName, mode: 'insensitive' },
                lastName: { equals: lastName, mode: 'insensitive' },
                phoneNumber: phoneNumber
            },
            select: { id: true }
        });

        return NextResponse.json({ success: true, exists: !!user });
    } catch (error) {
        console.error('Check duplicate error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
