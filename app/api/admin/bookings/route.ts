import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const bookings = await prisma.booking.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.booking.count()

    return NextResponse.json({
      success: true,
      bookings,
      total,
      limit,
      offset
    })
  } catch (error) {
    console.error('Admin get bookings error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get bookings' },
      { status: 500 }
    )
  }
}
