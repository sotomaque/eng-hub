"use client";

import { UserButton } from "@clerk/nextjs";
import { shadcn } from "@clerk/themes";
import { LayoutDashboard } from "lucide-react";

export function AppUserButton() {
	return (
		<UserButton
			appearance={{
				theme: shadcn,
				elements: {
					userButtonPopoverFooter: { display: "none" },
				},
			}}
		>
			<UserButton.MenuItems>
				<UserButton.Link
					label="My Dashboard"
					labelIcon={<LayoutDashboard className="size-4" />}
					href="/me"
				/>
			</UserButton.MenuItems>
		</UserButton>
	);
}
