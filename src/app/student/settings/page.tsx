import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentSettingsChangePassword from "@/components/student/student-settings/student-settings-change-password";
const Page: React.FC = () => {
  return (
    <div>
      <Tabs defaultValue="passwordChange">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="passwordChange">CHANGE PASSWORD</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          Make changes to your account here.
        </TabsContent>
        <TabsContent value="passwordChange">
          <StudentSettingsChangePassword />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Page;
