"use client";

import { useState } from "react";
import { Users, GraduationCap, Settings } from "lucide-react";
import { useAllBranchesOrdered } from "@/hooks/useBranchQuery";
import { useLineChannels } from "@/hooks/useLineChannelQuery";
import { Button } from "@/components/ui/button";
import { BranchChannelAssignment } from "./branch-channel-assignment";

interface BranchChannelCoverage {
  branchId: string;
  branchName: string;
  hasTeacherChannel: boolean;
  hasStudentChannel: boolean;
  teacherChannelName?: string;
  studentChannelName?: string;
}

export function BranchChannelOverview() {
  const { data: branchesData } = useAllBranchesOrdered();
  const { data: channelsData } = useLineChannels({ limit: 100 });
  const [selectedBranch, setSelectedBranch] = useState<{
    branchId: string;
    branchName: string;
    teacherChannelId?: string;
    studentChannelId?: string;
  } | null>(null);

  // Calculate channel coverage for each branch
  const coverage: BranchChannelCoverage[] = (branchesData || []).map(
    (branch) => {
      const teacherChannels = (channelsData?.data || []).filter((channel) =>
        channel.branches.some(
          (b) => b.branchId === branch.branchId && b.channelType === "TEACHER"
        )
      );
      const studentChannels = (channelsData?.data || []).filter((channel) =>
        channel.branches.some(
          (b) => b.branchId === branch.branchId && b.channelType === "STUDENT"
        )
      );

      return {
        branchId: branch.branchId,
        branchName: branch.name,
        hasTeacherChannel: teacherChannels.length > 0,
        hasStudentChannel: studentChannels.length > 0,
        teacherChannelName: teacherChannels[0]?.name,
        studentChannelName: studentChannels[0]?.name,
      };
    }
  );

  const fullyCovered = coverage.filter(
    (c) => c.hasTeacherChannel && c.hasStudentChannel
  ).length;
  const partiallyCovered = coverage.filter(
    (c) =>
      (c.hasTeacherChannel || c.hasStudentChannel) &&
      !(c.hasTeacherChannel && c.hasStudentChannel)
  ).length;
  const notCovered = coverage.filter(
    (c) => !c.hasTeacherChannel && !c.hasStudentChannel
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary Notes */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center gap-6">
          <h2 className="text-lg font-semibold text-foreground">
            チャンネル設定状況
          </h2>

          <div className="flex items-center gap-4">
            <div className="text-xs text-muted-foreground">対応状況表示:</div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-green-100 border border-green-300 dark:bg-green-900/70 dark:border-green-700"></div>
                <span className="text-green-700 dark:text-green-300">
                  完全対応 ({fullyCovered}校舎)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300 dark:bg-yellow-900/70 dark:border-yellow-700"></div>
                <span className="text-yellow-700 dark:text-yellow-300">
                  部分対応 ({partiallyCovered}校舎)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 dark:bg-red-900/70 dark:border-red-700"></div>
                <span className="text-red-700 dark:text-red-300">
                  未対応 ({notCovered}校舎)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            全{coverage.length}校舎
          </span>
        </div>
      </div>

      {/* Detailed Coverage */}
      <div className="space-y-3">
        <div className="border-b pb-2">
          <h3 className="text-base font-medium text-foreground">
            校舎別チャンネル設定詳細
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            各校舎の講師・生徒チャンネル設定状況
          </p>
        </div>

        <div className="space-y-2">
          {coverage.map((branch) => (
            <div
              key={branch.branchId}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50 hover:bg-background/80 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center gap-2">
                  {/* Status indicator - using same style as summary bullets */}
                  {branch.hasTeacherChannel && branch.hasStudentChannel ? (
                    <div className="w-3 h-3 rounded-sm bg-green-100 border border-green-300 dark:bg-green-900/70 dark:border-green-700"></div>
                  ) : branch.hasTeacherChannel || branch.hasStudentChannel ? (
                    <div className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300 dark:bg-yellow-900/70 dark:border-yellow-700"></div>
                  ) : (
                    <div className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 dark:bg-red-900/70 dark:border-red-700"></div>
                  )}
                  <span className="font-medium text-sm">
                    {branch.branchName}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">講師:</span>
                    {branch.hasTeacherChannel ? (
                      <span className="text-blue-700 dark:text-blue-300 font-medium">
                        {branch.teacherChannelName}
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">
                        未設定
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">生徒:</span>
                    {branch.hasStudentChannel ? (
                      <span className="text-green-700 dark:text-green-300 font-medium">
                        {branch.studentChannelName}
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">
                        未設定
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">
                  {branch.hasTeacherChannel && branch.hasStudentChannel
                    ? "完全対応"
                    : branch.hasTeacherChannel || branch.hasStudentChannel
                      ? "部分対応"
                      : "未対応"}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const teacherChannel = (channelsData?.data || []).find(
                      (channel) =>
                        channel.branches.some(
                          (b) =>
                            b.branchId === branch.branchId &&
                            b.channelType === "TEACHER"
                        )
                    );
                    const studentChannel = (channelsData?.data || []).find(
                      (channel) =>
                        channel.branches.some(
                          (b) =>
                            b.branchId === branch.branchId &&
                            b.channelType === "STUDENT"
                        )
                    );

                    setSelectedBranch({
                      branchId: branch.branchId,
                      branchName: branch.branchName,
                      teacherChannelId: teacherChannel?.id,
                      studentChannelId: studentChannel?.id,
                    });
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedBranch && (
        <BranchChannelAssignment
          open={!!selectedBranch}
          onOpenChange={(open) => !open && setSelectedBranch(null)}
          branchId={selectedBranch.branchId}
          branchName={selectedBranch.branchName}
          currentTeacherChannelId={selectedBranch.teacherChannelId}
          currentStudentChannelId={selectedBranch.studentChannelId}
        />
      )}
    </div>
  );
}
