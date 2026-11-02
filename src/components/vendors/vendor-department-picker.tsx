import { Field } from "@/components/ui/field";

export interface VendorDepartmentOption {
  id: string;
  name: string;
}

export function VendorDepartmentPicker({
  departments,
  selectedIds = [],
  error,
}: {
  departments: VendorDepartmentOption[];
  selectedIds?: string[];
  error?: string;
}) {
  return (
    <Field
      label="Departments"
      htmlFor="vendor-department-0"
      hint="Choose every kind of product your studio sells. You can select more than one."
      error={error}
    >
      {departments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active departments yet. Ask an administrator to add one.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {departments.map((department, index) => (
            <label
              key={department.id}
              htmlFor={`vendor-department-${index}`}
              className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors"
            >
              <input
                id={`vendor-department-${index}`}
                type="checkbox"
                name="departmentIds"
                value={department.id}
                defaultChecked={selectedIds.includes(department.id)}
                className="size-4 accent-primary"
              />
              {department.name}
            </label>
          ))}
        </div>
      )}
    </Field>
  );
}
