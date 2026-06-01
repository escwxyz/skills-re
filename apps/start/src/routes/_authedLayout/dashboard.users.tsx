import { useState, useMemo } from "react";
import { createFileRoute, redirect, useRouteContext } from "@tanstack/react-router";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  UsersIcon,
  ShieldCheckIcon,
  ProhibitIcon,
  GithubLogoIcon,
  EnvelopeIcon,
} from "@phosphor-icons/react";

import { TimeValue } from "@/components/time-value";
import {
  DataTableColumnHeader,
  DataTableToolbar,
  DataTablePagination,
} from "@/components/ui/data-table";
import { createSeo } from "@/lib/seo";
import { getLocale } from "@/paraglide/runtime";
import { getAdminUsersPageData } from "@/functions/dashboard/get-admin-users-page-data";
import type { AdminUsersPageData } from "@/functions/dashboard/get-admin-users-page-data";

type UserRow = AdminUsersPageData["users"][number] & { github?: string | null };

export const Route = createFileRoute("/_authedLayout/dashboard/users")({
  loader: async () => {
    try {
      return await getAdminUsersPageData();
    } catch {
      throw redirect({ to: "/dashboard" });
    }
  },
  ssr: "data-only",
  head: () =>
    createSeo({
      canonicalPath: "/dashboard/users",
      locale: getLocale(),
      noIndex: true,
      title: "Users",
    }),
  component: UsersRoute,
});

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin", icon: ShieldCheckIcon },
  { label: "User", value: "user", icon: UsersIcon },
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Banned", value: "banned" },
];

function RolePill({ role }: { role: string | null | undefined }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1.5 border border-chart-4/40 bg-chart-4/10 px-2 py-1 font-mono text-[10px] tracking-[0.16em] uppercase text-chart-4">
        <ShieldCheckIcon className="size-3" />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 border border-rule/60 bg-paper/70 px-2 py-1 font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
      <UsersIcon className="size-3" />
      User
    </span>
  );
}

function StatusPill({ banned }: { banned: boolean | null | undefined }) {
  if (banned) {
    return (
      <span className="inline-flex items-center gap-1.5 border border-destructive/40 bg-destructive/10 px-2 py-1 font-mono text-[10px] tracking-[0.16em] uppercase text-destructive">
        <ProhibitIcon className="size-3" />
        Banned
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 border border-chart-2/40 bg-chart-2/10 px-2 py-1 font-mono text-[10px] tracking-[0.16em] uppercase text-chart-2">
      Active
    </span>
  );
}

const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => {
      const { name } = row.original;
      const { email } = row.original;
      const { image } = row.original;
      const initials = (name || email || "?")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      return (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex size-7 shrink-0 items-center justify-center overflow-hidden border border-rule/60 bg-paper font-mono text-[10px] uppercase text-muted-text">
            {image ? (
              <img src={image} alt={name || ""} className="size-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <span className="truncate text-[13px] font-medium leading-none text-foreground">
            {name || <span className="text-muted-text italic">No name</span>}
          </span>
        </div>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => {
      const { email } = row.original;
      const verified = row.original.emailVerified;
      return (
        <div className="flex min-w-0 items-center gap-1.5">
          <EnvelopeIcon className="size-3 shrink-0 text-muted-text" />
          <span className="truncate font-mono text-[11px] text-foreground/80">{email}</span>
          {!verified && (
            <span className="shrink-0 font-mono text-[9px] tracking-[0.14em] uppercase text-muted-text/70">
              unverified
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "github",
    header: ({ column }) => <DataTableColumnHeader column={column} title="GitHub" />,
    cell: ({ row }) => {
      const { github } = row.original;
      if (!github) {
        return <span className="font-mono text-[11px] text-muted-text/50">—</span>;
      }
      return (
        <div className="flex items-center gap-1.5">
          <GithubLogoIcon className="size-3 shrink-0 text-muted-text" />
          <span className="font-mono text-[11px] text-foreground/80">@{github}</span>
        </div>
      );
    },
    filterFn: (row, _columnId, filterValue) => {
      const github = row.original.github ?? "";
      return github.toLowerCase().includes((filterValue as string).toLowerCase());
    },
  },
  {
    accessorKey: "role",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
    cell: ({ row }) => <RolePill role={row.original.role} />,
    filterFn: (row, _columnId, filterValues) => {
      if (!filterValues || (filterValues as string[]).length === 0) {
        return true;
      }
      const role = row.original.role ?? "user";
      return (filterValues as string[]).includes(role);
    },
  },
  {
    id: "status",
    accessorFn: (row) => (row.banned ? "banned" : "active"),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusPill banned={row.original.banned} />,
    filterFn: (row, _columnId, filterValues) => {
      if (!filterValues || (filterValues as string[]).length === 0) {
        return true;
      }
      const status = row.original.banned ? "banned" : "active";
      return (filterValues as string[]).includes(status);
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Joined" />,
    cell: ({ row }) => {
      const locale = getLocale();
      return (
        <span className="font-mono text-[11px] text-muted-text">
          <TimeValue locale={locale} time={new Date(row.original.createdAt).getTime()} />
        </span>
      );
    },
  },
];

function UsersTable({ users }: { users: UserRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  const tableFilters = useMemo(
    () => [
      {
        columnId: "role",
        title: "Role",
        options: ROLE_OPTIONS.map(({ label, value }) => ({ label, value })),
      },
      {
        columnId: "status",
        title: "Status",
        options: STATUS_OPTIONS,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: users,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: {
      pagination: { pageSize: 20 },
    },
  });

  return (
    <div className="space-y-3">
      <DataTableToolbar table={table} searchPlaceholder="Search users..." filters={tableFilters} />

      <div className="border border-rule/70 bg-background">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-rule/60 bg-paper/80">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-2.5 text-left font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-10 text-center font-mono text-[11px] text-muted-text"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-rule/40 transition-colors last:border-0 hover:bg-paper/60"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}

function UsersRoute() {
  const data = Route.useLoaderData();
  const { currentUser } = useRouteContext({ from: "/_authedLayout/dashboard" });

  if (!data || !currentUser) {
    return null;
  }

  const totalUsers = data.users.length;
  const adminCount = data.users.filter((u) => u.role === "admin").length;
  const bannedCount = data.users.filter((u) => u.banned).length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="border bg-paper p-6 shadow-[0_10px_40px_rgba(20,18,14,0.05)]">
        <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-muted-text">
          Admin
        </div>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,4rem)] leading-[0.92] tracking-[-0.04em]">
          Users
        </h1>
        <p className="mt-4 max-w-2xl text-[13px] leading-[1.65] text-muted-text">
          Manage all registered accounts — view roles, email verification status, and ban details.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {[
            { label: "Total", value: totalUsers },
            { label: "Admins", value: adminCount },
            { label: "Banned", value: bannedCount },
          ].map(({ label, value }) => (
            <div key={label} className="border border-rule/60 bg-background px-4 py-2.5">
              <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
                {label}
              </div>
              <div className="mt-1 font-display text-[1.6rem] leading-none tracking-[-0.03em]">
                {value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <UsersTable users={data.users} />
    </div>
  );
}
