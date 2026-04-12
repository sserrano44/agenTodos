import { Skeleton } from "@/components/ui/skeleton";

export default function AdminTodosLoading() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
      <Skeleton className="h-[720px] rounded-3xl" />
      <Skeleton className="h-[720px] rounded-3xl" />
    </div>
  );
}
