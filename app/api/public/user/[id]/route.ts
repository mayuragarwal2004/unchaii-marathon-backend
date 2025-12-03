import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                firstName: true,
                middleName: true,
                lastName: true,
                distance: true,
                tshirtSize: true,
                gender: true,
                age: true,
                gotra: true,
                emergencyContactName: true,
                emergencyContactPhone: true,
                medicalConditions: true,
                medications: true,
                allergies: true,
            }
        });

        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, user });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch user' }, { status: 500 });
    }
}
