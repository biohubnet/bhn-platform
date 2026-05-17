import { ListChecks } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureCourseFilterOptions } from "@/lib/courses/filter-options";
import { CourseFilterOptionsAdmin } from "@/components/admin/CourseFilterOptionsAdmin";
import { PageHero } from "@/components/ui/PageHero";

export default async function CourseFiltersAdminPage() {
  await requireRole("admin");
  await ensureCourseFilterOptions();

  const options = await prisma.courseFilterOption.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { value: "asc" }],
  });

  return (
    <div>
      <PageHero
        eyebrow={<><ListChecks size={11} /> Admin · ENGAGE</>}
        title="Course catalog filters"
        description="Add, rename, hide, or reorder the topic / delivery / provider options that drive the catalog filter rail. Existing courses keep their assigned values even if you hide an option from the picker."
      />
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
