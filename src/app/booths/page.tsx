"use client";

import { useBooths } from "@/hooks/useBoothQuery";
import { useBoothDelete } from "@/hooks/useBoothMutation";
import { Button } from "@/components/ui/button";

export default function BoothList() {
  const { data, isLoading } = useBooths();
  const deleteBooth = useBoothDelete();

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul className="grid gap-4 w-full max-w-md mx-auto">
      {data?.map((booth) => (
        <li key={booth.boothId} className="flex justify-between items-center">
          <span>
            {booth.name} ({booth.notes})
          </span>
          <Button
            onClick={() => {
              console.log("Deleting booth", booth.boothId);
              deleteBooth.mutate(booth.boothId);
            }}
            variant="destructive"
            size="sm"
          >
            Delete
          </Button>
        </li>
      ))}
    </ul>
  );
}
