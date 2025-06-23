import { NextRequest, NextResponse } from 'next/server';
import { withBranchAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateLinkingCode } from '@/lib/line';

// POST - Generate a new linking code for a student
export const POST = withBranchAccess(
  ['ADMIN', 'STAFF'],
  async (request: NextRequest, session, branchId) => {
    try {
      const studentId = request.url.split('/').slice(-2)[0];

      // Find the student
      const student = await prisma.student.findUnique({
        where: { studentId },
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

      if (!student) {
        return NextResponse.json(
          { error: '生徒が見つかりません' },
          { status: 404 }
        );
      }

      // Check branch access for non-admin users
      if (session.user?.role !== 'ADMIN') {
        const userBranches = student.user.branches.map(b => b.branchId);
        if (!userBranches.includes(branchId)) {
          return NextResponse.json(
            { error: 'この生徒にアクセスする権限がありません' },
            { status: 403 }
          );
        }
      }

      // Generate a new linking code
      const linkingCode = generateLinkingCode();

      // Update the student with the new linking code
      const updatedStudent = await prisma.student.update({
        where: { studentId },
        data: { linkingCode },
        select: {
          studentId: true,
          name: true,
          linkingCode: true,
          lineId: true
        }
      });

      return NextResponse.json({
        data: {
          studentId: updatedStudent.studentId,
          name: updatedStudent.name,
          linkingCode: updatedStudent.linkingCode,
          isLinked: !!updatedStudent.lineId
        },
        message: 'リンクコードが生成されました'
      });
    } catch (error) {
      console.error('Error generating student linking code:', error);
      return NextResponse.json(
        { error: 'リンクコードの生成に失敗しました' },
        { status: 500 }
      );
    }
  }
);

// DELETE - Clear the linking code for a student
export const DELETE = withBranchAccess(
  ['ADMIN', 'STAFF'],
  async (request: NextRequest, session, branchId) => {
    try {
      const studentId = request.url.split('/').slice(-2)[0];

      // Find the student
      const student = await prisma.student.findUnique({
        where: { studentId },
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

      if (!student) {
        return NextResponse.json(
          { error: '生徒が見つかりません' },
          { status: 404 }
        );
      }

      // Check branch access for non-admin users
      if (session.user?.role !== 'ADMIN') {
        const userBranches = student.user.branches.map(b => b.branchId);
        if (!userBranches.includes(branchId)) {
          return NextResponse.json(
            { error: 'この生徒にアクセスする権限がありません' },
            { status: 403 }
          );
        }
      }

      // Clear the linking code
      const updatedStudent = await prisma.student.update({
        where: { studentId },
        data: { linkingCode: null },
        select: {
          studentId: true,
          name: true,
          linkingCode: true,
          lineId: true
        }
      });

      return NextResponse.json({
        data: {
          studentId: updatedStudent.studentId,
          name: updatedStudent.name,
          linkingCode: updatedStudent.linkingCode,
          isLinked: !!updatedStudent.lineId
        },
        message: 'リンクコードがクリアされました'
      });
    } catch (error) {
      console.error('Error clearing student linking code:', error);
      return NextResponse.json(
        { error: 'リンクコードのクリアに失敗しました' },
        { status: 500 }
      );
    }
  }
);