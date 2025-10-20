import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import {
  verifySignature,
  sendLineReply,
  LineWebhookBody,
  LineChannelCredentials,
} from "@/lib/line-multi-channel";

export async function POST(req: NextRequest) {
  try {
    const channelId = req.url.split("/").pop();

    if (!channelId) {
      console.error("Missing channelId in webhook URL");
      return NextResponse.json(
        { error: "Missing channel ID" },
        { status: 400 }
      );
    }

    const body = await req.text();
    const signature = req.headers.get("x-line-signature");

    console.log("LINE webhook received for channel:", channelId, {
      hasBody: !!body,
      bodyLength: body?.length,
      hasSignature: !!signature,
      signatureLength: signature?.length,
    });

    // Allow LINE "Verify" pings without signature or with empty body
    if (!signature) {
      // Treat as verification if body is empty or non-JSON/empty-events
      if (!body || body.trim() === "") {
        console.log("Verification without signature (empty body)");
        return NextResponse.json({}, { status: 200 });
      }
      try {
        const maybe = JSON.parse(body);
        if (!maybe?.events || maybe.events.length === 0) {
          console.log("Verification without signature (no events)");
          return NextResponse.json({}, { status: 200 });
        }
      } catch {
        console.log("Verification without signature (non-JSON body)");
        return NextResponse.json({}, { status: 200 });
      }
      console.error(
        "Missing x-line-signature header for non-verification payload"
      );
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Get channel credentials
    const channel = await prisma.lineChannel.findUnique({
      where: { channelId },
    });

    if (!channel || !channel.isActive) {
      console.error("Channel not found or inactive:", channelId);
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const credentials: LineChannelCredentials = {
      channelAccessToken: decrypt(channel.channelAccessToken),
      channelSecret: decrypt(channel.channelSecret),
    };

    // Verify webhook signature
    if (!verifySignature(body, signature, credentials.channelSecret)) {
      // Still allow verification attempts with no/empty events
      try {
        const maybe = body ? JSON.parse(body) : {};
        if (!maybe?.events || maybe.events.length === 0) {
          console.log(
            "Invalid signature but empty/no events – treating as verification"
          );
          return NextResponse.json({}, { status: 200 });
        }
      } catch {
        console.log(
          "Invalid signature but non-JSON – treating as verification"
        );
        return NextResponse.json({}, { status: 200 });
      }
      console.error("Invalid LINE webhook signature for channel:", channelId);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle empty body (verification request)
    if (!body || body.trim() === "") {
      console.log("LINE webhook verification request received (empty body)");
      return NextResponse.json({}, { status: 200 });
    }

    // Parse the JSON body
    let data: LineWebhookBody;
    try {
      data = JSON.parse(body);
    } catch (parseError) {
      console.error("Error parsing LINE webhook body:", parseError);
      // For verification, LINE might send non-JSON data, so return 200 OK
      console.log("Returning 200 for non-JSON body (possible verification)");
      return NextResponse.json({}, { status: 200 });
    }

    // Handle verification or test requests with no events
    if (!data.events || data.events.length === 0) {
      console.log(
        "LINE webhook received with no events (verification or test)"
      );
      return NextResponse.json({}, { status: 200 });
    }

    // Get branches associated with this channel
    const channelBranches = await prisma.branchLineChannel.findMany({
      where: { channelId },
      select: { branchId: true },
    });
    const branchIds = channelBranches.map((cb) => cb.branchId);

    console.log(
      `Processing ${data.events.length} LINE webhook events for channel ${channelId}`
    );

    // Process each event
    for (const event of data.events) {
      // Only process text messages
      if (event.type !== "message" || event.message?.type !== "text") {
        continue;
      }

      const text = event.message.text;
      const lineId = event.source.userId;
      const replyToken = event.replyToken;

      if (!text || !lineId || !replyToken) {
        continue;
      }

      // Check if message starts with "> " or "/ " (case-insensitive)
      const trimmedText = text.trim();
      const lowerText = trimmedText.toLowerCase();
      if (!lowerText.startsWith("> ") && !lowerText.startsWith("/ ")) {
        // Ignore regular chat messages - no error response
        console.log(
          `Ignoring regular chat message: ${trimmedText.substring(0, 50)}...`
        );
        continue;
      }

      // Remove the prefix and get the actual identifier (using regex for case-insensitive matching)
      const identifierWithType = trimmedText.replace(/^(> |\/\s+)/i, "").trim();

      // Built-in commands
      const cmdLower = identifierWithType.toLowerCase();

      // whoami: show current link status on this channel for this LINE user
      if (cmdLower === "whoami") {
        const studentLinks = await prisma.studentLineLink.findMany({
          where: { channelId, lineUserId: lineId },
          include: {
            student: { include: { user: true } },
          },
        });

        const teacherLink = await prisma.teacherLineLink.findFirst({
          where: { channelId, lineUserId: lineId },
          include: { teacher: { include: { user: true } } },
        });

        if (studentLinks.length === 0 && !teacherLink) {
          await sendLineReply(
            replyToken,
            'ℹ️ このチャンネルに連携されたアカウントはありません。\n\n連携するには "> ユーザー名" を送信してください。',
            credentials
          );
        } else {
          const lines: string[] = ["🔎 現在の連携状況:"];
          for (const link of studentLinks) {
            const status = link.enabled ? "通知有効" : "通知無効";
            const slotName = link.accountSlot === "parent" ? "保護者" : "生徒";
            lines.push(
              `- ${slotName}: ${link.student.name} (@${link.student.user.username}) / ${status}`
            );
          }
          if (teacherLink) {
            const status = teacherLink.enabled ? "通知有効" : "通知無効";
            lines.push(
              `- 講師: ${teacherLink.teacher.name} (@${teacherLink.teacher.user.username}) / ${status}`
            );
          }
          await sendLineReply(replyToken, lines.join("\n"), credentials);
        }
        continue;
      }

      // stop: disable notifications on this channel for this LINE user (keep links)
      if (cmdLower === "stop") {
        await prisma.studentLineLink.updateMany({
          where: { channelId, lineUserId: lineId, enabled: true },
          data: { enabled: false },
        });
        await prisma.teacherLineLink.updateMany({
          where: { channelId, lineUserId: lineId, enabled: true },
          data: { enabled: false },
        });

        await sendLineReply(
          replyToken,
          '✅ 通知を停止しました。\n\n今後このチャンネルからの通知は届きません。\n再開するには "> ユーザー名" を送信してください。',
          credentials
        );
        continue;
      }

      // Parse identifier and optional account type suffix (legacy: "username:parent")
      const [identifier, accountType] = identifierWithType
        .split(":")
        .map((s) => s.trim());
      const explicitAccountType = accountType?.toLowerCase(); // may be undefined

      // Check for logout commands (exit, quit) - case insensitive
      const logoutRegex = /^(>?\s*exit|>?\s*quit|\/?\s*exit|\/?\s*quit)$/i;
      // Removed per-slot logout; use unified exit only

      if (logoutRegex.test(trimmedText)) {
        // Find linked accounts for this channel and LINE ID
        const studentLinks = await prisma.studentLineLink.findMany({
          where: {
            channelId,
            lineUserId: lineId,
            enabled: true,
          },
          include: {
            student: {
              include: { user: true },
            },
          },
        });

        const teacherLink = await prisma.teacherLineLink.findFirst({
          where: {
            channelId,
            lineUserId: lineId,
            enabled: true,
          },
          include: {
            teacher: {
              include: { user: true },
            },
          },
        });

        if (studentLinks.length > 0) {
          // Disable all student links for this LINE ID on this channel
          await prisma.studentLineLink.updateMany({
            where: {
              channelId,
              lineUserId: lineId,
            },
            data: { enabled: false },
          });

          const accountTypes = studentLinks
            .map((link) => (link.accountSlot === "student" ? "生徒" : "保護者"))
            .join("、");

          const student = studentLinks[0].student;
          try {
            await sendLineReply(
              replyToken,
              `✅ ${accountTypes}アカウントのログアウトが完了しました。\n\n今後このチャンネルからの通知を送信しません。\n\n再度連携する場合は "> ${student.user.username}" を送信してください。`,
              credentials
            );
          } catch (replyError) {
            console.error(
              "Error sending logout reply for student:",
              replyError
            );
          }
          continue;
        } else if (teacherLink) {
          // Disable teacher link for this channel
          await prisma.teacherLineLink.update({
            where: { id: teacherLink.id },
            data: { enabled: false },
          });

          try {
            await sendLineReply(
              replyToken,
              `✅ ログアウトしました。\n\n今後このチャンネルからの通知を受け取ることはありません。\n\n再度連携する場合は "> ${teacherLink.teacher.user.username}" を送信してください。`,
              credentials
            );
          } catch (replyError) {
            console.error(
              "Error sending logout reply for teacher:",
              replyError
            );
          }
          continue;
        } else {
          // No linked account found
          try {
            await sendLineReply(
              replyToken,
              '❌ このチャンネルにまだアカウントが連携されていません。\n\nアカウントを連携するには "> ユーザー名" を送信してください。',
              credentials
            );
          } catch (replyError) {
            console.error("Error sending no account reply:", replyError);
          }
          continue;
        }
      }

      // First try to find a user with this username
      let user = await prisma.user.findFirst({
        where: {
          username: identifier,
          // If channel is associated with specific branches, limit to users in those branches
          ...(branchIds.length > 0
            ? {
                branches: {
                  some: {
                    branchId: { in: branchIds },
                  },
                },
              }
            : {}),
        },
        include: {
          student: true,
          teacher: true,
          branches: true,
        },
      });

      // If not found by username, try to find by LINE User ID
      if (!user) {
        const student = await prisma.student.findFirst({
          where: {
            lineUserId: identifier,
            user:
              branchIds.length > 0
                ? {
                    branches: {
                      some: {
                        branchId: { in: branchIds },
                      },
                    },
                  }
                : undefined,
          },
          include: {
            user: {
              include: {
                student: true,
                teacher: true,
                branches: true,
              },
            },
          },
        });

        if (student) {
          user = student.user;
        } else {
          const teacher = await prisma.teacher.findFirst({
            where: {
              lineUserId: identifier,
              user:
                branchIds.length > 0
                  ? {
                      branches: {
                        some: {
                          branchId: { in: branchIds },
                        },
                      },
                    }
                  : undefined,
            },
            include: {
              user: {
                include: {
                  student: true,
                  teacher: true,
                  branches: true,
                },
              },
            },
          });

          if (teacher) {
            user = teacher.user;
          }
        }
      }

      if (user) {
        // Multi-channel link per channelId
        try {
          if (user.student) {
            // Determine slot: honor explicit legacy suffix if provided; otherwise auto-assign
            let slot: "student" | "parent" | "auto" = "auto";
            if (
              explicitAccountType === "student" ||
              explicitAccountType === "parent"
            ) {
              slot = explicitAccountType;
            }
            // Prevent linking same LINE ID to another account on this channel
            const conflict =
              (await prisma.studentLineLink.findFirst({
                where: {
                  channelId,
                  lineUserId: lineId,
                  NOT: { studentId: user.student.studentId },
                },
              })) ||
              (await prisma.teacherLineLink.findFirst({
                where: { channelId, lineUserId: lineId },
              }));
            if (conflict) {
              await sendLineReply(
                replyToken,
                "このLINEアカウントは既に別のアカウントにリンクされています。",
                credentials
              );
              continue;
            }
            // Resolve desired slot and upsert
            let finalSlot: "student" | "parent" = "student";
            if (slot === "student" || slot === "parent") {
              // Legacy explicit behavior
              if (slot === "parent") {
                const existingParent = await prisma.studentLineLink.findFirst({
                  where: {
                    studentId: user.student.studentId,
                    accountSlot: "parent",
                  },
                });
                if (existingParent && existingParent.lineUserId !== lineId) {
                  await sendLineReply(
                    replyToken,
                    "❌ 既に別の保護者アカウントが連携されています。先に既存の保護者連携を解除してください。",
                    credentials
                  );
                  continue;
                }
              }
              await prisma.studentLineLink.upsert({
                where: {
                  channelId_studentId_accountSlot: {
                    channelId,
                    studentId: user.student.studentId,
                    accountSlot: slot,
                  },
                },
                update: { lineUserId: lineId, enabled: true },
                create: {
                  channelId,
                  studentId: user.student.studentId,
                  accountSlot: slot as any,
                  lineUserId: lineId,
                  enabled: true,
                },
              });
              finalSlot = slot;
            } else {
              // Auto-assign: prefer student slot, else parent (respect global parent constraint)
              const existingLinks = await prisma.studentLineLink.findMany({
                where: { channelId, studentId: user.student.studentId },
              });
              const studentLink = existingLinks.find(
                (l) => l.accountSlot === "student"
              );
              const parentLink = existingLinks.find(
                (l) => l.accountSlot === "parent"
              );

              if (
                !studentLink ||
                !studentLink.enabled ||
                studentLink.lineUserId === lineId
              ) {
                await prisma.studentLineLink.upsert({
                  where: {
                    channelId_studentId_accountSlot: {
                      channelId,
                      studentId: user.student.studentId,
                      accountSlot: "student",
                    },
                  },
                  update: { lineUserId: lineId, enabled: true },
                  create: {
                    channelId,
                    studentId: user.student.studentId,
                    accountSlot: "student" as any,
                    lineUserId: lineId,
                    enabled: true,
                  },
                });
                finalSlot = "student";
              } else {
                // Check global one-parent constraint
                const existingParentGlobal =
                  await prisma.studentLineLink.findFirst({
                    where: {
                      studentId: user.student.studentId,
                      accountSlot: "parent",
                    },
                  });
                if (
                  existingParentGlobal &&
                  existingParentGlobal.lineUserId &&
                  existingParentGlobal.lineUserId !== lineId &&
                  (!parentLink || parentLink.lineUserId !== lineId)
                ) {
                  await sendLineReply(
                    replyToken,
                    "❌ 既に別の保護者アカウントが連携されています。先に既存の保護者連携を解除してください。",
                    credentials
                  );
                  continue;
                }
                await prisma.studentLineLink.upsert({
                  where: {
                    channelId_studentId_accountSlot: {
                      channelId,
                      studentId: user.student.studentId,
                      accountSlot: "parent",
                    },
                  },
                  update: { lineUserId: lineId, enabled: true },
                  create: {
                    channelId,
                    studentId: user.student.studentId,
                    accountSlot: "parent" as any,
                    lineUserId: lineId,
                    enabled: true,
                  },
                });
                finalSlot = "parent";
              }
            }

            // Get branch names for the message
            const userBranches = await prisma.userBranch.findMany({
              where: { userId: user.id },
              include: { branch: true },
            });
            const branchNames = userBranches
              .map((ub) => ub.branch.name)
              .join(", ");

            const accountTypeName = finalSlot === "parent" ? "保護者" : "生徒";

            await sendLineReply(
              replyToken,
              `✅ ${accountTypeName}アカウントがこのチャンネルに連携されました！\n生徒名: ${user.student.name}\nユーザー名: ${user.username}\nアカウントタイプ: ${accountTypeName}\n所属: ${branchNames || "なし"}\n\n授業の通知をこちらのLINEアカウントにお送りします。`,
              credentials
            );
            continue;
          } else if (user.teacher) {
            const conflict =
              (await prisma.teacherLineLink.findFirst({
                where: {
                  channelId,
                  lineUserId: lineId,
                  NOT: { teacherId: user.teacher.teacherId },
                },
              })) ||
              (await prisma.studentLineLink.findFirst({
                where: { channelId, lineUserId: lineId },
              }));
            if (conflict) {
              await sendLineReply(
                replyToken,
                "このLINEアカウントは既に別のアカウントにリンクされています。",
                credentials
              );
              continue;
            }
            await prisma.teacherLineLink.upsert({
              where: {
                channelId_teacherId: {
                  channelId,
                  teacherId: user.teacher.teacherId,
                },
              },
              update: { lineUserId: lineId, enabled: true },
              create: {
                channelId,
                teacherId: user.teacher.teacherId,
                lineUserId: lineId,
                enabled: true,
              },
            });

            // Get branch names for the message
            const userBranches = await prisma.userBranch.findMany({
              where: { userId: user.id },
              include: { branch: true },
            });
            const branchNames = userBranches
              .map((ub) => ub.branch.name)
              .join(", ");

            await sendLineReply(
              replyToken,
              `✅ 講師アカウントがこのチャンネルに連携されました！\n講師名: ${user.teacher.name}\nユーザー名: ${user.username}\n所属: ${branchNames || "なし"}\n\n授業の通知をこちらのLINEアカウントにお送りします。`,
              credentials
            );
            continue;
          }
        } catch (e) {
          console.error("Linking failed:", e);
          await sendLineReply(
            replyToken,
            "❌ アカウントの連携中にエラーが発生しました。再度お試しください。",
            credentials
          );
          continue;
        }
      }

      // Invalid username/LINE User ID or user has no student/teacher profile
      try {
        await sendLineReply(
          replyToken,
          '❌ 無効なユーザー名またはLINEユーザーIDです。\n\n正しいユーザー名またはLINEユーザーIDを入力するか、システム管理者にお問い合わせください。\n\n💡 ヒント: コマンドは "> " または "/ " で始めてください。',
          credentials
        );
      } catch (replyError) {
        console.error("Error sending invalid username reply:", replyError);
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Error processing LINE webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const channelId = req.url.split("/").pop();

    if (!channelId) {
      return NextResponse.json(
        { error: "Missing channel ID" },
        { status: 400 }
      );
    }

    // Get channel information
    const channel = await prisma.lineChannel.findUnique({
      where: { channelId },
      include: {
        branchLineChannels: {
          include: {
            branch: true,
          },
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Get branches assigned to this channel
    const branches = channel.branchLineChannels.map((bc) => bc.branch.name);

    // Return webhook information
    return NextResponse.json({
      status: "ok",
      webhook: {
        url: req.url,
        channelId: channel.channelId,
        channelName: channel.name,
        isActive: channel.isActive,
        branches: branches.length > 0 ? branches : ["No branches assigned"],
        setupInstructions: {
          step1: "Copy this webhook URL",
          step2:
            "Go to LINE Developers Console (https://developers.line.biz/console/)",
          step3: "Select your channel",
          step4: 'Go to "Messaging API" tab',
          step5:
            'In "Webhook settings", paste this URL and enable "Use webhook"',
          step6: 'Click "Verify" to test the connection',
          note: "Make sure your NEXTAUTH_URL environment variable is set to your actual domain",
        },
      },
    });
  } catch (error) {
    console.error("Error handling webhook GET request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
