import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { ArrowLeft, Building2, Github } from "lucide-react";
import Link from "next/link";
import { PersonRoadmapCard } from "@/components/person-roadmap-card";

interface PersonData {
  id: string;
  firstName: string;
  lastName: string;
  callsign: string | null;
  email: string;
  imageUrl: string | null;
  githubUsername: string | null;
  gitlabUsername: string | null;
  department: { name: string } | null;
  title: { name: string } | null;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    callsign: string | null;
    imageUrl: string | null;
  } | null;
  directReports: Array<{
    id: string;
    firstName: string;
    lastName: string;
    callsign: string | null;
    imageUrl: string | null;
    email: string;
  }>;
  projectMemberships: Array<{
    id: string;
    projectId: string;
    project: { id: string; name: string };
    teamMemberships: Array<{ team: { name: string } }>;
  }>;
  milestoneAssignments: Array<{
    milestone: {
      id: string;
      title: string;
      status: string;
      targetDate: string | null;
      projectId: string;
      project: { id: string; name: string };
    };
  }>;
  quarterlyGoalAssignments: Array<{
    quarterlyGoal: {
      id: string;
      title: string;
      status: string;
      quarter: string | null;
      targetDate: string | null;
      projectId: string;
      project: { id: string; name: string };
    };
  }>;
  ownedProjects: Array<{
    id: string;
    project: { id: string; name: string };
  }>;
}

interface PersonProfileProps {
  person: PersonData;
  hideBackLink?: boolean;
}

export function PersonProfile({ person, hideBackLink }: PersonProfileProps) {
  const fullName = `${person.firstName} ${person.lastName}`;
  const initials = `${person.firstName[0]}${person.lastName[0]}`;

  return (
    <div className="space-y-6">
      {!hideBackLink && (
        <Link
          href="/people"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to People
        </Link>
      )}

      <div className="flex items-start gap-5">
        <Avatar className="size-20">
          <AvatarImage src={person.imageUrl ?? undefined} alt={fullName} />
          <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
          {person.callsign && <p className="text-muted-foreground text-lg">@{person.callsign}</p>}
          <p className="text-muted-foreground text-sm">{person.email}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {person.department && <Badge variant="secondary">{person.department.name}</Badge>}
            {person.title && <Badge variant="outline">{person.title.name}</Badge>}
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Projects
              {person.projectMemberships.length > 0 && (
                <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {person.projectMemberships.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {person.projectMemberships.length === 0 ? (
              <p className="text-muted-foreground text-sm">Not assigned to any projects</p>
            ) : (
              <ul className="space-y-3">
                {person.projectMemberships.map((membership) => (
                  <li key={membership.id}>
                    <Link
                      href={`/projects/${membership.project.id}`}
                      className="font-medium hover:underline"
                    >
                      {membership.project.name}
                    </Link>
                    {membership.teamMemberships.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {membership.teamMemberships.map((tm) => (
                          <Badge key={tm.team.name} variant="outline" className="text-xs">
                            {tm.team.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <PersonRoadmapCard
          milestoneAssignments={person.milestoneAssignments}
          quarterlyGoalAssignments={person.quarterlyGoalAssignments}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Owned Projects
              {person.ownedProjects.length > 0 && (
                <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {person.ownedProjects.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {person.ownedProjects.length === 0 ? (
              <p className="text-muted-foreground text-sm">Not an owner of any projects</p>
            ) : (
              <ul className="space-y-2">
                {person.ownedProjects.map((op) => (
                  <li key={op.id}>
                    <Link
                      href={`/projects/${op.project.id}`}
                      className="font-medium hover:underline"
                    >
                      {op.project.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manager</CardTitle>
          </CardHeader>
          <CardContent>
            {person.manager ? (
              <Link
                href={`/people/${person.manager.id}`}
                className="flex items-center gap-2 hover:underline"
              >
                <Avatar className="size-8">
                  <AvatarImage
                    src={person.manager.imageUrl ?? undefined}
                    alt={`${person.manager.firstName} ${person.manager.lastName}`}
                  />
                  <AvatarFallback className="text-xs">
                    {person.manager.firstName[0]}
                    {person.manager.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {person.manager.firstName} {person.manager.lastName}
                </span>
              </Link>
            ) : (
              <p className="text-muted-foreground text-sm">No manager assigned</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Direct Reports
              {person.directReports.length > 0 && (
                <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {person.directReports.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {person.directReports.length === 0 ? (
              <p className="text-muted-foreground text-sm">No direct reports</p>
            ) : (
              <ul className="space-y-2">
                {person.directReports.map((report) => (
                  <li key={report.id}>
                    <Link
                      href={`/people/${report.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <Avatar className="size-6">
                        <AvatarImage
                          src={report.imageUrl ?? undefined}
                          alt={`${report.firstName} ${report.lastName}`}
                        />
                        <AvatarFallback className="text-xs">
                          {report.firstName[0]}
                          {report.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {report.firstName} {report.lastName}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {(person.githubUsername || person.gitlabUsername) && (
          <Card>
            <CardHeader>
              <CardTitle>Identifiers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {person.githubUsername && (
                <div className="flex items-center gap-2">
                  <Github className="text-muted-foreground size-4" />
                  <span className="text-sm">{person.githubUsername}</span>
                </div>
              )}
              {person.gitlabUsername && (
                <div className="flex items-center gap-2">
                  <Building2 className="text-muted-foreground size-4" />
                  <span className="text-sm">{person.gitlabUsername}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
