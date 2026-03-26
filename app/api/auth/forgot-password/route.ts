/**
 * Forgot Password API
 *
 * POST /api/auth/forgot-password
 * Generates a reset token, stores it on the user, and returns success.
 * In production, this would send an email. For MVP, the token is
 * logged to the console and the reset URL is returned in the response
 * (for demo/testing purposes).
 *
 * @module api/auth/forgot-password
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, password: true },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.password) {
      return NextResponse.json({
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = nanoid(48);
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    // In production: send email with reset link
    // For MVP/demo: log the token and return the URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    console.log(`[Password Reset] Token for ${email}: ${resetToken}`);
    console.log(`[Password Reset] URL: ${resetUrl}`);

    return NextResponse.json({
      message: 'If an account with that email exists, a reset link has been sent.',
      // Include reset URL in response for demo/testing (remove in production)
      resetUrl,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
