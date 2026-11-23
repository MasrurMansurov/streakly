"use client"

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVerticalIcon } from "lucide-react"
import { useId, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import type { Habit } from "@/lib/data"
import { cn } from "@/lib/utils"

type Props = {
  habits: Habit[]
  onReorder: (ids: string[]) => void
  renderHabit: (habit: Habit, dragHandle: ReactNode) => ReactNode
}

/** Habit grid with drag-and-drop reordering (mouse, touch and keyboard). */
export function SortableHabits({ habits, onReorder, renderHabit }: Props) {
  // stable id avoids SSR/client mismatch of dnd-kit's aria attributes
  const id = useId()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // screen reader announcements with habit names instead of ids
  const nameOf = (id: string | number) => habits.find((h) => h.id === id)?.name ?? "habit"
  const positionOf = (id: string | number) => habits.findIndex((h) => h.id === id) + 1
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}. Use arrow keys to move, space to drop.`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(active.id)} moved to position ${positionOf(over.id)} of ${habits.length}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over ? `${nameOf(active.id)} dropped at position ${positionOf(over.id)} of ${habits.length}.` : `${nameOf(active.id)} dropped.`,
    onDragCancel: ({ active }) => `Reordering cancelled. ${nameOf(active.id)} returned to its place.`,
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = habits.map((h) => h.id)
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: "To reorder, press space or enter, use the arrow keys to move, then press space again to drop.",
        },
      }}
    >
      <SortableContext items={habits.map((h) => h.id)} strategy={rectSortingStrategy}>
        <section className="grid gap-3 md:grid-cols-2">
          {habits.map((h) => (
            <SortableItem key={h.id} habit={h} renderHabit={renderHabit} />
          ))}
        </section>
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({ habit, renderHabit }: { habit: Habit; renderHabit: Props["renderHabit"] }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: habit.id })

  const handle = (
    <Button
      ref={setActivatorNodeRef}
      variant="ghost"
      size="icon-sm"
      aria-label={`Reorder “${habit.name}”`}
      className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon />
    </Button>
  )

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-80 shadow-lg")}
    >
      {renderHabit(habit, handle)}
    </div>
  )
}
