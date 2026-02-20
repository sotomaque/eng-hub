import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { redirect } from "next/navigation";
import { getMe } from "./_lib/queries";

export default async function MeProfilePage() {
  const person = await getMe();

  if (!person) {
    redirect("/people");
  }

  const fullName = `${person.firstName} ${person.lastName}`;
  const initials = `${person.firstName[0]}${person.lastName[0]}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={person.imageUrl ?? undefined} alt={fullName} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{fullName}</h1>
          {person.callsign && (
            <p className="text-muted-foreground">@{person.callsign}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {person.email && (
              <div>
                <p className="text-muted-foreground text-sm">Email</p>
                <p>{person.email}</p>
              </div>
            )}
            {person.department && (
              <div>
                <p className="text-muted-foreground text-sm">Department</p>
                <Badge variant="secondary">{person.department.name}</Badge>
              </div>
            )}
            {person.title && (
              <div>
                <p className="text-muted-foreground text-sm">Title</p>
                <Badge variant="outline">{person.title.name}</Badge>
              </div>
            )}
            {person.manager && (
              <div>
                <p className="text-muted-foreground text-sm">Manager</p>
                <p>
                  {person.manager.firstName} {person.manager.lastName}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Direct Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {person.directReports.length === 0 ? (
              <p className="text-muted-foreground text-sm">No direct reports</p>
            ) : (
              <ul className="space-y-2">
                {person.directReports.map((report) => (
                  <li key={report.id} className="flex items-center gap-2">
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
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
