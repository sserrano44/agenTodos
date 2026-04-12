import Link from "next/link";

import {
  deleteTodoAction,
  saveTodoAction,
  toggleTodoCompletionAction,
} from "@/app/admin/todos/actions";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminSession } from "@/lib/auth/admin";
import { PRIORITY_LABELS, SOURCE_LABELS, STATUS_LABELS, TODO_PRIORITIES, TODO_SOURCES, TODO_STATUSES } from "@/lib/constants";
import { getTodo, listTodos } from "@/lib/data/todos";
import { getSearchParam, parseTodoFiltersInput } from "@/lib/query-parsers";
import { formatDateTime, toDateTimeLocalInput } from "@/lib/utils";

export default async function AdminTodosPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminSession();
  const workspaceId = session.activeWorkspace.id;
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = parseTodoFiltersInput(resolvedSearchParams);
  const [todos, editTodo] = await Promise.all([
    listTodos(workspaceId, filters),
    getSearchParam(resolvedSearchParams, "edit")
      ? getTodo(workspaceId, getSearchParam(resolvedSearchParams, "edit")!)
      : Promise.resolve(null),
  ]);

  const errorMessage = getSearchParam(resolvedSearchParams, "error");

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>{editTodo ? "Edit todo" : "Create todo"}</CardTitle>
          <CardDescription>
            Manual admin entry in {session.activeWorkspace.name} uses the same normalized schema
            exposed to agents over REST and MCP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <form action={saveTodoAction} className="flex flex-col gap-4">
            {editTodo ? <input type="hidden" name="id" value={editTodo.id} /> : null}
            <FormField label="Title" htmlFor="title">
              <Input
                id="title"
                name="title"
                required
                defaultValue={editTodo?.title ?? ""}
                placeholder="Review schedule drift for Monday ingest"
              />
            </FormField>

            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                defaultValue={editTodo?.description ?? ""}
                placeholder="Optional details for admins or agents."
              />
            </FormField>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Status" htmlFor="status">
                <SelectField id="status" name="status" defaultValue={editTodo?.status ?? "todo"}>
                  {TODO_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </SelectField>
              </FormField>
              <FormField label="Priority" htmlFor="priority">
                <SelectField
                  id="priority"
                  name="priority"
                  defaultValue={editTodo?.priority ?? "medium"}
                >
                  {TODO_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </SelectField>
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Source" htmlFor="source">
                <SelectField
                  id="source"
                  name="source"
                  defaultValue={editTodo?.source ?? "manual"}
                >
                  {TODO_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {SOURCE_LABELS[source]}
                    </option>
                  ))}
                </SelectField>
              </FormField>
              <FormField label="External ID" htmlFor="external_id">
                <Input
                  id="external_id"
                  name="external_id"
                  defaultValue={editTodo?.external_id ?? ""}
                  placeholder="cw-123 / oc-456"
                />
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Due at" htmlFor="due_at">
                <Input
                  id="due_at"
                  name="due_at"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalInput(editTodo?.due_at)}
                />
              </FormField>
              <FormField label="Scheduled for" htmlFor="scheduled_for">
                <Input
                  id="scheduled_for"
                  name="scheduled_for"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalInput(editTodo?.scheduled_for)}
                />
              </FormField>
            </div>

            <FormField label="Tags" htmlFor="tags">
              <Input
                id="tags"
                name="tags"
                defaultValue={editTodo?.tags.join(", ") ?? ""}
                placeholder="ops, ingestion, scheduler"
              />
            </FormField>

            <FormField label="Metadata JSON" htmlFor="metadata">
              <Textarea
                id="metadata"
                name="metadata"
                defaultValue={JSON.stringify(editTodo?.metadata ?? {}, null, 2)}
                className="font-[var(--font-mono)] text-xs"
              />
            </FormField>

            <div className="flex flex-wrap gap-3">
              <SubmitButton pendingText={editTodo ? "Saving..." : "Creating..."}>
                {editTodo ? "Save changes" : "Create todo"}
              </SubmitButton>
              {editTodo ? (
                <Button asChild variant="outline" type="button">
                  <Link href="/admin/todos">Cancel</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Todo list</CardTitle>
            <CardDescription>
              Filter by state, source, priority, due date, and text search.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-6" method="GET">
              <div className="md:col-span-2">
                <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search todos" />
              </div>
              <SelectField name="status" defaultValue={filters.status ?? ""}>
                <option value="">All statuses</option>
                {TODO_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </SelectField>
              <SelectField name="source" defaultValue={filters.source ?? ""}>
                <option value="">All sources</option>
                {TODO_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {SOURCE_LABELS[source]}
                  </option>
                ))}
              </SelectField>
              <SelectField name="priority" defaultValue={filters.priority ?? ""}>
                <option value="">All priorities</option>
                {TODO_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </SelectField>
              <SelectField name="sort" defaultValue={filters.sort}>
                <option value="created_at_desc">Newest first</option>
                <option value="created_at_asc">Oldest first</option>
                <option value="due_at_asc">Due date ascending</option>
                <option value="due_at_desc">Due date descending</option>
              </SelectField>
              <Input
                name="due_after"
                type="datetime-local"
                defaultValue={toDateTimeLocalInput(filters.due_after)}
              />
              <Input
                name="due_before"
                type="datetime-local"
                defaultValue={toDateTimeLocalInput(filters.due_before)}
              />
              <div className="flex gap-3 md:col-span-6">
                <Button type="submit" variant="outline">
                  Apply filters
                </Button>
                <Button asChild type="button" variant="ghost">
                  <Link href="/admin/todos">Reset</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {todos.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                No todos matched these filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Todo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todos.map((todo) => (
                      <TableRow key={todo.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="font-medium">{todo.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {todo.description || "No description"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge>{STATUS_LABELS[todo.status]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{SOURCE_LABELS[todo.source]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{PRIORITY_LABELS[todo.priority]}</Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(todo.due_at)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/admin/todos?edit=${todo.id}`}>Edit</Link>
                            </Button>
                            <form action={toggleTodoCompletionAction}>
                              <input type="hidden" name="id" value={todo.id} />
                              <input type="hidden" name="current_status" value={todo.status} />
                              <Button type="submit" size="sm" variant="secondary">
                                {todo.status === "done" ? "Reopen" : "Complete"}
                              </Button>
                            </form>
                            <form action={deleteTodoAction}>
                              <input type="hidden" name="id" value={todo.id} />
                              <Button type="submit" size="sm" variant="destructive">
                                Delete
                              </Button>
                            </form>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function SelectField({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`flex h-10 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/10 ${className ?? ""}`}
      {...props}
    />
  );
}
