import { Request, Response } from "express";
import { prisma } from "../service/prisma";
import { responseFormatter } from "../middleware/responseFormatter";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isAdmin = user.roles.includes("ADMIN");
    const userId = user.userId;

    // Filter logic: Admin sees all, Organizer sees only their own
    const orderFilter: any = { status: "DONE" };
    const eventFilter: any = { deleted: false, archived: false };

    if (!isAdmin) {
      orderFilter.event = { createdBy: userId };
      eventFilter.createdBy = userId;
    }

    // 1. Total Revenue & Tickets Sold
    const orderStats = await prisma.order.aggregate({
      where: orderFilter,
      _sum: {
        totalPrice: true,
        quantity: true,
      },
      _count: {
        id: true,
      },
    });

    // 2. Active Events Count
    const activeEventsCount = await prisma.event.count({
      where: {
        ...eventFilter,
        date: { gt: new Date() },
      },
    });

    // 3. Total Events Hosted (History)
    const totalEventsCount = await prisma.event.count({
      where: eventFilter,
    });

    // 4. Top 5 Performing Events by Revenue
    const topEventsByRevenue = await prisma.order.groupBy({
      by: ["eventId"],
      where: orderFilter,
      _sum: {
        totalPrice: true,
        quantity: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          totalPrice: "desc",
        },
      },
      take: 5,
    });

    const topEventsWithDetails = await Promise.all(
      topEventsByRevenue.map(async (item) => {
        const event = await prisma.event.findUnique({
          where: { id: item.eventId },
          select: { name: true },
        });
        return {
          id: item.eventId,
          name: event?.name || "Unknown",
          revenue: item._sum.totalPrice?.toString() || "0",
          ticketsSold: item._sum.quantity || 0,
        };
      })
    );

    // 5. Time-series Data (Detailed Reports)
    const revenueByYear = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        DATE_PART('year', "createdAt") as year, 
        SUM("totalPrice")::TEXT as revenue,
        SUM("quantity")::INTEGER as "ticketsSold"
      FROM "Order"
      WHERE "status" = 'DONE' ${!isAdmin ? `AND "eventId" IN (SELECT id FROM "Event" WHERE "createdBy" = ${userId})` : ''}
      GROUP BY year
      ORDER BY year DESC
    `);

    const revenueByMonth = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month, 
        SUM("totalPrice")::TEXT as revenue,
        SUM("quantity")::INTEGER as "ticketsSold"
      FROM "Order"
      WHERE "status" = 'DONE' ${!isAdmin ? `AND "eventId" IN (SELECT id FROM "Event" WHERE "createdBy" = ${userId})` : ''}
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `);

    const revenueByDay = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        DATE_TRUNC('day', "createdAt") as day, 
        SUM("totalPrice")::TEXT as revenue,
        SUM("quantity")::INTEGER as "ticketsSold"
      FROM "Order"
      WHERE "status" = 'DONE' ${!isAdmin ? `AND "eventId" IN (SELECT id FROM "Event" WHERE "createdBy" = ${userId})` : ''}
      GROUP BY day
      ORDER BY day DESC
      LIMIT 30
    `);

    // 6. Recent Transactions
    const recentTransactions = await prisma.order.findMany({
      where: orderFilter,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        event: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const formattedTransactions = recentTransactions.map((order) => ({
      id: order.id,
      customer: `${order.user.firstName} ${order.user.lastName || ""}`.trim(),
      event: order.event.name,
      totalPrice: order.totalPrice.toString(),
      quantity: order.quantity,
      createdAt: order.createdAt,
    }));

    const stats = {
      totalRevenue: orderStats._sum.totalPrice?.toString() || "0",
      totalTicketsSold: orderStats._sum.quantity || 0,
      activeEvents: activeEventsCount,
      totalEvents: totalEventsCount,
      topEvents: topEventsWithDetails,
      reports: {
        yearly: revenueByYear,
        monthly: revenueByMonth,
        daily: revenueByDay,
      },
      recentTransactions: formattedTransactions,
    };

    return res.status(200).send(
      responseFormatter({
        code: 200,
        status: "success",
        message: "Dashboard statistics retrieved successfully.",
        data: stats,
      }),
    );
  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    return res.status(500).send(
      responseFormatter({
        code: 500,
        status: "error",
        message: error.message || "Internal server error.",
      }),
    );
  }
};
