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

        // 3. Build Search Conditions for SQL
        const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];

        if (search) {
            const tokens = search.trim().split(/\s+/);
            tokens.forEach(token => {
                const pattern = `%${token}%`;
                conditions.push(Prisma.sql`(
                    "bibNum" ILIKE ${pattern} OR 
                    "firstName" ILIKE ${pattern} OR 
                    "middleName" ILIKE ${pattern} OR 
                    "lastName" ILIKE ${pattern} OR 
                    "email" ILIKE ${pattern} OR 
                    "phoneNumber" ILIKE ${pattern} OR 
                    "id" ILIKE ${pattern}
                )`);
            });
        }

        if (distance && distance !== 'all') {
            conditions.push(Prisma.sql`"distance" = ${distance}`);
        }
        if (tshirtSize && tshirtSize !== 'all') {
            conditions.push(Prisma.sql`"tshirtSize" = ${tshirtSize}`);
        }
        if (isBibGiven !== null && isBibGiven !== '') {
            conditions.push(Prisma.sql`"isBibGiven" = ${isBibGiven === 'true'}`);
        }
        if (isTshirtGiven !== null && isTshirtGiven !== '') {
            conditions.push(Prisma.sql`"isTshirtGiven" = ${isTshirtGiven === 'true'}`);
        }

        const whereSql = Prisma.join(conditions, ' AND ');

        // 4. Build Ordering and Relevance
        const relevanceSql = search ? Prisma.sql`, 
            CASE 
                WHEN "bibNum" = ${search} THEN 1
                WHEN "bibNum" ILIKE ${search + '%'} THEN 2
                WHEN "firstName" ILIKE ${search + '%'} OR "lastName" ILIKE ${search + '%'} THEN 3
                ELSE 4
            END AS relevance` : Prisma.empty;

        const orderBySql = search ? Prisma.sql`relevance ASC, "createdAt" DESC` : Prisma.sql`"createdAt" DESC`;

        // 5. Build Final Queries
        const usersQuery = Prisma.sql`
            SELECT * ${relevanceSql}
            FROM "User"
            WHERE ${whereSql}
            ORDER BY ${orderBySql}
            ${isExport ? Prisma.empty : Prisma.sql`LIMIT ${limit} OFFSET ${skip}`}
        `;

        const countQuery = Prisma.sql`
            SELECT COUNT(*)::int as count
            FROM "User"
            WHERE ${whereSql}
        `;

        const [users, countResult] = await Promise.all([
            prisma.$queryRaw<(Prisma.UserGetPayload<object> & { relevance?: number })[]>(usersQuery),
            prisma.$queryRaw<{ count: number }[]>(countQuery),
        ]);

        const total = countResult[0]?.count || 0;

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
