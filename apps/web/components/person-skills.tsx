"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { Zap } from "lucide-react";
import { getTagColor } from "@/lib/tag-colors";
import { useTRPC } from "@/lib/trpc/client";

type PersonSkillsProps = {
  personId: string;
};

export function PersonSkills({ personId }: PersonSkillsProps) {
  const trpc = useTRPC();
  const { data: skills, isLoading } = useQuery(trpc.skill.getByPersonId.queryOptions({ personId }));

  if (isLoading || !skills || skills.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="text-muted-foreground size-4" />
          Skills
          <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
            {skills.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <Badge key={skill.id} className={cn("border-0 px-2 py-0.5", getTagColor(skill.name))}>
              {skill.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
