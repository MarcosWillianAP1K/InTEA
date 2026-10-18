import DashboardLayout from "@/layout/dashboardLayout";
import { PatientsContent } from "../components/patientsContent";

export default function PatientsPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-1 flex-col gap-6 w-full mx-auto py-2 overflow-x-hidden">
        <PatientsContent />
      </div>
    </DashboardLayout>
  );
}
