"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";

interface CourseShape {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  passingScore: number;
  maxAttempts: number;
  duration: number | null;
  creditCost: number;
  thumbnail: string | null;
}

export function CourseEditButton({ course }: { course: CourseShape }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [category, setCategory] = useState(course.category ?? "");
  const [status, setStatus] = useState(course.status);
  const [passingScore, setPassingScore] = useState(String(course.passingScore));
  const [maxAttempts, setMaxAttempts] = useState(String(course.maxAttempts));
  const [duration, setDuration] = useState(course.duration != null ? String(course.duration) : "");
  const [creditCost, setCreditCost] = useState(String(course.creditCost));
  const [thumbnail, setThumbnail] = useState(course.thumbnail ?? "");

  async function save() {
    if (!title.trim()) {
      alert("Title is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          status,
          passingScore: Number(passingScore) || 0,
          maxAttempts: Number(maxAttempts) || 0,
          duration: duration ? Number(duration) : null,
          creditCost: Number(creditCost) || 0,
          thumbnail: thumbnail.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Save failed");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} size="sm">
        <Pencil size={14} /> Edit
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Edit course"
        description="Changes apply immediately. Existing enrollments are preserved."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={loading}>Save changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Cleanroom" />
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Passing score (%)">
              <Input type="number" min="0" max="100" value={passingScore} onChange={(e) => setPassingScore(e.target.value)} />
            </Field>
            <Field label="Max attempts" hint="0 = unlimited">
              <Input type="number" min="0" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
            </Field>
            <Field label="Duration (min)">
              <Input type="number" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Credit cost (BHN)">
              <Input type="number" min="0" value={creditCost} onChange={(e) => setCreditCost(e.target.value)} />
            </Field>
            <Field label="Thumbnail URL">
              <Input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="https://…" />
            </Field>
          </div>
        </div>
      </Modal>
    </>
  );
}
