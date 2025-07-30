"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Users, GraduationCap, AlertTriangle } from "lucide-react";
import { useAllBranchesOrdered } from "@/hooks/useBranchQuery";
import { useLineChannels } from "@/hooks/useLineChannelQuery";

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

  // Calculate channel coverage for each branch
  const coverage: BranchChannelCoverage[] = (branchesData?.data || []).map(branch => {
    const teacherChannels = (channelsData?.data || []).filter(channel =>
      channel.branches.some(b => b.branchId === branch.branchId && b.channelType === 'TEACHER')
    );
    const studentChannels = (channelsData?.data || []).filter(channel =>
      channel.branches.some(b => b.branchId === branch.branchId && b.channelType === 'STUDENT')
    );

    return {
      branchId: branch.branchId,
      branchName: branch.name,
      hasTeacherChannel: teacherChannels.length > 0,
      hasStudentChannel: studentChannels.length > 0,
      teacherChannelName: teacherChannels[0]?.name,
      studentChannelName: studentChannels[0]?.name,
    };
  });

  const fullyCovered = coverage.filter(c => c.hasTeacherChannel && c.hasStudentChannel).length;
  const partiallyCovered = coverage.filter(c => (c.hasTeacherChannel || c.hasStudentChannel) && !(c.hasTeacherChannel && c.hasStudentChannel)).length;
  const notCovered = coverage.filter(c => !c.hasTeacherChannel && !c.hasStudentChannel).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">全校舎</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coverage.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">完全対応</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fullyCovered}</div>
            <p className="text-xs text-muted-foreground">講師・生徒両方</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">部分対応</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{partiallyCovered}</div>
            <p className="text-xs text-muted-foreground">どちらか一方のみ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未対応</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{notCovered}</div>
            <p className="text-xs text-muted-foreground">チャンネル未設定</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>校舎別チャンネル設定状況</CardTitle>
          <CardDescription>
            各校舎の講師・生徒チャンネル設定状況を確認できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {coverage.map((branch) => (
              <div key={branch.branchId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-medium">{branch.branchName}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span className="text-xs text-muted-foreground">講師:</span>
                        {branch.hasTeacherChannel ? (
                          <Badge variant="default" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                            {branch.teacherChannelName}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                            未設定
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <GraduationCap className="h-3 w-3" />
                        <span className="text-xs text-muted-foreground">生徒:</span>
                        {branch.hasStudentChannel ? (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">
                            {branch.studentChannelName}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                            未設定
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {branch.hasTeacherChannel && branch.hasStudentChannel ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (branch.hasTeacherChannel || branch.hasStudentChannel) ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}