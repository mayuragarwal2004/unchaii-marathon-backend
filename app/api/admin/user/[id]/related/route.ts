import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Auth check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Get the current user to find their phone number
        const currentUser = await prisma.user.findUnique({
            where: { id },
            select: { phoneNumber: true }
        });

        if (!currentUser) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // 2. Find other users with the same phone number
        const relatedUsers = await prisma.user.findMany({
            where: {
                phoneNumber: currentUser.phoneNumber,
                id: { not: id } // Exclude the current user
            },
            select: {
                id: true,
                firstName: true,
                middleName: true,
                lastName: true,
                bibNum: true,
                isBibGiven: true,
                isTshirtGiven: true,
                tshirtSize: true,
                distance: true
            },
            orderBy: {
                firstName: 'asc'
            }
        });

        return NextResponse.json({ success: true, users: relatedUsers });
    } catch (error) {
        console.error('Fetch related users error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch related users' }, { status: 500 });
    }
}
