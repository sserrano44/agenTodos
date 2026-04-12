import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAgentsLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <Skeleton className="h-[420px] rounded-3xl" />
      <Skeleton className="h-[680px] rounded-3xl" />
    </div>
  );
}
