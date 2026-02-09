import React, { useState } from "react";
import KanbanColumn from "./KanbanColumn";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import TaskDetailModal from "./TaskDetailModal";

const columnsData = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "awaiting", title: "Awaiting Customer" },
  { id: "blocked", title: "Blocked" },
  { id: "done", title: "Done" },
];

export default function KanbanBoard({ filter, member, search, tasks, setTasks, idToGlobalIndex, allBadgesOpen, priorityColorsOpen, taskIdsOpen, subtaskButtonsOpen }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const handleTaskClick = (task) => {
    // index'i idToGlobalIndex ile bul ve task'a ekle
    const index = idToGlobalIndex ? idToGlobalIndex[task.id] : undefined;
    setSelectedTask({ ...task, index });
    setModalOpen(true);
  };

  const handleTaskUpdate = (updatedTask) => {
    // Update the task in the tasks array
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    );
    setSelectedTask(updatedTask);
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    setTasks((prev) => {
      const movedTask = tasks.find((task) => task.id === draggableId);
      let newTasks = prev.filter((task) => task.id !== draggableId);

      if (destination.droppableId === source.droppableId) {
        // Aynı kolonda sıralama değişikliği
        const columnTasks = newTasks.filter((t) => t.status === destination.droppableId);
        const before = newTasks.filter((t) => t.status !== destination.droppableId);
        columnTasks.splice(destination.index, 0, movedTask);
        return [
          ...before,
          ...columnTasks
        ];
      } else {
        // Farklı kolona taşınıyorsa, destination.index'e ekle
        const destTasks = newTasks.filter((t) => t.status === destination.droppableId);
        const before = newTasks.filter((t) => t.status !== destination.droppableId);
        destTasks.splice(destination.index, 0, { ...movedTask, status: destination.droppableId });
        return [
          ...before,
          ...destTasks
        ];
      }
    });
  };

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="w-full flex justify-center h-full min-h-[calc(100vh-10rem)]">
          <div className="grid grid-cols-6 gap-4 w-full h-full min-h-[calc(100vh-10rem)] pb-16 bg-white">
            {columnsData.map((col) => (
              <Droppable droppableId={col.id} key={col.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex flex-col min-w-0 h-full"
                  >
                    <KanbanColumn
                      title={col.title}
                      tasks={tasks.filter((t) => {
                        const matchesType = !filter || t.type === filter;
                        const matchesMember = !member || t.assignedTo === member;
                        const matchesSearch = !search || (
                          t.title.toLowerCase().includes(search.toLowerCase()) ||
                          t.description.toLowerCase().includes(search.toLowerCase())
                        );
                        return t.status === col.id && matchesType && matchesMember && matchesSearch;
                      })}
                      columnId={col.id}
                      idToGlobalIndex={idToGlobalIndex}
                      allBadgesOpen={allBadgesOpen}
                      priorityColorsOpen={priorityColorsOpen}
                      taskIdsOpen={taskIdsOpen}
                      subtaskButtonsOpen={subtaskButtonsOpen}
                      onTaskClick={handleTaskClick}
                    />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </div>
      </DragDropContext>
      <TaskDetailModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        task={selectedTask} 
        onTaskUpdate={handleTaskUpdate}
        allTasks={tasks}
      />
    </>
  );
} 