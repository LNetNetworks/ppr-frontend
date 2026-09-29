'use client'

import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu } from '@/components/dropdown'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { TableActionsIcon } from '@/components/table-icons'
import { getStatusLabel } from '@/lib/status-labels'
import { getStatusClass, STATUS_BADGE_BASE_CLASS } from '@/lib/status-styles'
import type { Task } from '@/types/api'

interface TasksTableProps {
  tasks: Task[]
  isLoading?: boolean
  emptyMessage?: string
  title?: string
  description?: string
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

/**
 * Reusable Tasks Table Component
 * Displays a list of tasks in a table format
 */
export function TasksTable({
  tasks,
  isLoading = false,
  emptyMessage = 'No tasks found',
  title,
  description,
  onEdit,
  onDelete,
}: TasksTableProps) {
  const renderTable = () => {
    if (isLoading) {
      return (
        <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader>ID</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader className="text-center">Status</TableHeader>
              <TableHeader>Created At</TableHeader>
              <TableHeader>Due Date</TableHeader>
              <TableHeader className="text-center">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center text-zinc-500">
                Loading tasks...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    }

    if (tasks.length === 0) {
      return (
        <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader>ID</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader className="text-center">Status</TableHeader>
              <TableHeader>Created At</TableHeader>
              <TableHeader>Due Date</TableHeader>
              <TableHeader className="text-center">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center text-zinc-500">
                {emptyMessage}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    }

    return (
      <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>ID</TableHeader>
            <TableHeader>Name</TableHeader>
            <TableHeader className="text-center">Status</TableHeader>
            <TableHeader>Created At</TableHeader>
            <TableHeader>Due Date</TableHeader>
            <TableHeader className="text-center">Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => {
            return (
              <TableRow key={task.id} title={`Task ${(task as any).task_nameTask || task.name || 'N/A'}`}>
                {/** id */}
                <TableCell className="font-mono text-sm">{task.id}</TableCell>
                {/** name */}
                <TableCell className="font-medium">{(task as any).task_nameTask || task.name || 'N/A'}</TableCell>
                {/** status */}
                <TableCell className="text-center">
                  <span className={`${STATUS_BADGE_BASE_CLASS} ${getStatusClass(task.status)}`}>
                    {getStatusLabel(task.status)}
                  </span>
                </TableCell>
                {/** created at */}
                <TableCell className="text-zinc-500">
                  {task.createdAt ? new Date(task.createdAt).toLocaleString() : 'N/A'}
                </TableCell>
                {/** due date */}
                <TableCell className="text-zinc-500">
                  {task.dueDate ? new Date(task.dueDate).toLocaleString() : 'N/A'}
                </TableCell>
                {/** actions */}
                <TableCell className="text-center">
                  <div
                    className="relative z-10 flex min-h-[2.5rem] items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Dropdown>
                      <DropdownButton plain aria-label="More options" className="p-1.5">
                        <TableActionsIcon className="size-4" />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end">
                        {onEdit && (
                          <DropdownItem
                            onClick={(e) => {
                              e.stopPropagation()
                              onEdit(task)
                            }}
                          >
                            <DropdownLabel>Edit</DropdownLabel>
                          </DropdownItem>
                        )}
                        {onDelete && (
                          <DropdownItem
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(task)
                            }}
                          >
                            <DropdownLabel>Delete</DropdownLabel>
                          </DropdownItem>
                        )}
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  // If title is provided, wrap in container with header
  if (title) {
    return (
      <>
        <div className="border-b border-zinc-200 pb-5 dark:border-white/10">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div className="sm:flex-auto">
              {title && <h1 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h1>}
              {description && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{description}</p>}
            </div>
          </div>
        </div>
        {renderTable()}
      </>
    )
  }

  // Otherwise, return table without header wrapper
  return renderTable()
}
