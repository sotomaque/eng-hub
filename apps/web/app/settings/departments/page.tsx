import { DepartmentManager } from "@/components/department-manager";

export default function DepartmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Departments & Titles
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage departments and their associated titles. Titles are used for
          team composition bars and member cards.
        </p>
      </div>
      <DepartmentManager />
    </div>
  );
}
