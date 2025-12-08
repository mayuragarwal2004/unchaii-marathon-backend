import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
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
        const { searchParams } = new URL(request.url);

        // 1. Pagination Params
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;
        const isExport = searchParams.get('export') === 'true';

        // 2. Filter Params
        const search = searchParams.get('search') || '';
        const distance = searchParams.get('distance');
        const tshirtSize = searchParams.get('tshirtSize');
        const isBibGiven = searchParams.get('isBibGiven');
        const isTshirtGiven = searchParams.get('isTshirtGiven');

        // 3. Build Where Query
        const where: Prisma.UserWhereInput = {};

        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { middleName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search, mode: 'insensitive' } },
                { id: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (distance && distance !== 'all') where.distance = distance;
        if (tshirtSize && tshirtSize !== 'all') where.tshirtSize = tshirtSize;

        if (isBibGiven !== null && isBibGiven !== '') {
            where.isBibGiven = isBibGiven === 'true';
        }

        if (isTshirtGiven !== null && isTshirtGiven !== '') {
            where.isTshirtGiven = isTshirtGiven === 'true';
        }

        // 4. Execute Queries
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: isExport ? undefined : skip,
                take: isExport ? undefined : limit,
            }),
            prisma.user.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            users,
            pagination: {
                total,
                pages: isExport ? 1 : Math.ceil(total / limit),
                current: page,
                limit: isExport ? total : limit
            }
        });

    } catch (error) {
        console.error('Fetch users error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
    }
}
