import React from "react";
import TaskCard from "./TaskCard";
import { Draggable, Droppable } from "@hello-pangea/dnd";

export default function KanbanColumn({ title, tasks, columnId, idToGlobalIndex, allBadgesOpen, priorityColorsOpen, taskIdsOpen, subtaskButtonsOpen, onTaskClick }) {
  return (
    <div className="bg-white rounded-lg p-3 w-full flex flex-col h-full min-h-[300px] border-2 border-gray-300 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-gray-700 uppercase tracking-wider text-2xs sm:text-xs md:text-sm transition-all truncate whitespace-nowrap overflow-hidden">
          {title}
        </span>
        <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 text-xs font-normal min-w-6 text-center">
          {tasks.length}
        </span>
      </div>
      <Droppable droppableId={columnId}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 flex flex-col gap-3"
          >
            {tasks.length === 0 ? (
              <div className="text-xs text-gray-400 text-center mt-8">No tasks</div>
            ) : (
              tasks.map((task, idx) => (
                <Draggable draggableId={task.id} index={idx} key={task.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={
                        "transition-all duration-200 " +
                        (snapshot.isDragging
                          ? "scale-105 shadow-2xl z-20"
                          : "")
                      }
                    >
                      <TaskCard
                        task={{ ...task, index: idToGlobalIndex ? idToGlobalIndex[task.id] : idx }}
                        allBadgesOpen={allBadgesOpen}
                        priorityColorsOpen={priorityColorsOpen}
                        taskIdsOpen={taskIdsOpen}
                        subtaskButtonsOpen={subtaskButtonsOpen}
                        onClick={() => onTaskClick && onTaskClick(task)}
                      />
                    </div>
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
} 