import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format, subDays } from 'date-fns';

export async function GET() {
    try {
        // 1. Total Counts
        const totalUsers = await prisma.user.count();

        // 2. Verified Users (Assuming phone number is present/verified means registered, 
        // technically all users in DB are "registered" but we can check other flags if needed)
        // For now, total users is the metric. 
        // We can count bib/t-shirt distribution.
        const bibsDistributed = await prisma.user.count({ where: { isBibGiven: true } });
        const tshirtsDistributed = await prisma.user.count({ where: { isTshirtGiven: true } });

        // 3. Registration Trend (Last 30 Days)
        const thirtyDaysAgo = subDays(new Date(), 30);
        const usersCreatedLast30Days = await prisma.user.groupBy({
            by: ['createdAt'],
            where: {
                createdAt: {
                    gte: thirtyDaysAgo,
                },
            },
            _count: {
                _all: true,
            },
        });

        // Process trend data: aggregate by day
        const trendMap = new Map<string, number>();
        usersCreatedLast30Days.forEach((entry) => {
            const day = format(entry.createdAt, 'yyyy-MM-dd');
            trendMap.set(day, (trendMap.get(day) || 0) + entry._count._all);
        });

        const trendData = [];
        for (let i = 29; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const dayKey = format(date, 'yyyy-MM-dd');
            trendData.push({
                date: format(date, 'MMM dd'),
                count: trendMap.get(dayKey) || 0,
            });
        }

        // 4. Distance Distribution
        const distanceData = await prisma.user.groupBy({
            by: ['distance'],
            _count: {
                distance: true,
            },
        });

        // 5. Tee Shirt Size Distribution
        const tshirtData = await prisma.user.groupBy({
            by: ['tshirtSize'],
            _count: {
                tshirtSize: true,
            },
        });

        // 6. Gender Distribution
        const genderData = await prisma.user.groupBy({
            by: ['gender'],
            _count: {
                gender: true,
            }
        })

        return NextResponse.json({
            success: true,
            stats: {
                totalUsers,
                bibsDistributed,
                tshirtsDistributed,
                trend: trendData,
                distance: distanceData.map(d => ({ name: d.distance, value: d._count.distance })),
                tshirt: tshirtData.map(t => ({ name: t.tshirtSize, value: t._count.tshirtSize })),
                gender: genderData.map(g => ({ name: g.gender, value: g._count.gender })),
            },
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch usage stats' }, { status: 500 });
    }
}
