import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureCourseFilterOptions } from "@/lib/courses/filter-options";
import { CourseFilterOptionsAdmin } from "@/components/admin/CourseFilterOptionsAdmin";

export default async function CourseFiltersAdminPage() {
  await requireRole("admin");
  await ensureCourseFilterOptions();

  const options = await prisma.courseFilterOption.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { value: "asc" }],
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-fg mb-1">Course catalog filters</h1>
      <p className="text-sm text-muted mb-6 max-w-2xl leading-relaxed">
        Add, rename, hide, or reorder the topic / delivery / provider options that drive the catalog filter rail. Existing courses keep their assigned values even if you hide an option from the picker.
      </p>
      <CourseFilterOptionsAdmin
        initial={options.map((o) => ({
          id: o.id,
          type: o.type as "topic" | "delivery" | "provider",
          value: o.value,
          sortOrder: o.sortOrder,
          active: o.active,
        }))}
      />
    </div>
  );
}
