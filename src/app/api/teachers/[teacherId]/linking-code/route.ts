import { NextRequest, NextResponse } from 'next/server';
import { withBranchAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateLinkingCode } from '@/lib/line';

// POST - Generate a new linking code for a teacher
export const POST = withBranchAccess(
  ['ADMIN', 'STAFF'],
  async (request: NextRequest, session, branchId) => {
    try {
      const teacherId = request.url.split('/').slice(-2)[0];

      // Find the teacher
      const teacher = await prisma.teacher.findUnique({
        where: { teacherId },
        include: {
          user: {
            include: {
              branches: {
                select: {
                  branchId: true
                }
              }
            }
          }
        }
      });

      if (!teacher) {
        return NextResponse.json(
          { error: '講師が見つかりません' },
          { status: 404 }
        );
      }

      // Check branch access for non-admin users
      if (session.user?.role !== 'ADMIN') {
        const userBranches = teacher.user.branches.map(b => b.branchId);
        if (!userBranches.includes(branchId)) {
          return NextResponse.json(
            { error: 'この講師にアクセスする権限がありません' },
            { status: 403 }
          );
        }
      }

      // Generate a new linking code
      const linkingCode = generateLinkingCode();

      // Update the teacher with the new linking code
      const updatedTeacher = await prisma.teacher.update({
        where: { teacherId },
        data: { linkingCode },
        select: {
          teacherId: true,
          name: true,
          linkingCode: true,
          lineId: true
        }
      });

      return NextResponse.json({
        data: {
          teacherId: updatedTeacher.teacherId,
          name: updatedTeacher.name,
          linkingCode: updatedTeacher.linkingCode,
          isLinked: !!updatedTeacher.lineId
        },
        message: 'リンクコードが生成されました'
      });
    } catch (error) {
      console.error('Error generating teacher linking code:', error);
      return NextResponse.json(
        { error: 'リンクコードの生成に失敗しました' },
        { status: 500 }
      );
    }
  }
);

// DELETE - Clear the linking code for a teacher
export const DELETE = withBranchAccess(
  ['ADMIN', 'STAFF'],
  async (request: NextRequest, session, branchId) => {
    try {
      const teacherId = request.url.split('/').slice(-2)[0];

      // Find the teacher
      const teacher = await prisma.teacher.findUnique({
        where: { teacherId },
        include: {
          user: {
            include: {
              branches: {
                select: {
                  branchId: true
                }
              }
            }
          }
        }
      });

      if (!teacher) {
        return NextResponse.json(
          { error: '講師が見つかりません' },
          { status: 404 }
        );
      }

      // Check branch access for non-admin users
      if (session.user?.role !== 'ADMIN') {
        const userBranches = teacher.user.branches.map(b => b.branchId);
        if (!userBranches.includes(branchId)) {
          return NextResponse.json(
            { error: 'この講師にアクセスする権限がありません' },
            { status: 403 }
          );
        }
      }

      // Clear the linking code
      const updatedTeacher = await prisma.teacher.update({
        where: { teacherId },
        data: { linkingCode: null },
        select: {
          teacherId: true,
          name: true,
          linkingCode: true,
          lineId: true
        }
      });

      return NextResponse.json({
        data: {
          teacherId: updatedTeacher.teacherId,
          name: updatedTeacher.name,
          linkingCode: updatedTeacher.linkingCode,
          isLinked: !!updatedTeacher.lineId
        },
        message: 'リンクコードがクリアされました'
      });
    } catch (error) {
      console.error('Error clearing teacher linking code:', error);
      return NextResponse.json(
        { error: 'リンクコードのクリアに失敗しました' },
        { status: 500 }
      );
    }
  }
);