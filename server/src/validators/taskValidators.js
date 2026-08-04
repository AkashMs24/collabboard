const { z } = require('zod');

// Matches route: POST /api/boards/:boardId/columns/:columnId/tasks
// Matches taskController.createTask body destructure exactly
const createTaskSchema = {
  params: z.object({
    boardId: z.string().uuid(),
    columnId: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().max(5000).optional().nullable(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    tag: z.string().max(30).optional().nullable(),
    due_date: z.string().optional().nullable(),
    assignee_id: z.string().uuid().optional().nullable(),
    idempotency_key: z.string().optional().nullable(),
  }),
};

// Matches route: PATCH /api/tasks/:taskId/move
// Matches taskController.moveTask body destructure exactly
const moveTaskSchema = {
  params: z.object({ taskId: z.string().uuid() }),
  body: z.object({
    column_id: z.string().uuid(),
    position: z.number().int().min(0),
    board_id: z.string().uuid(),
  }),
};

// Matches route: PATCH /api/tasks/:taskId
const updateTaskSchema = {
  params: z.object({ taskId: z.string().uuid() }),
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(5000).optional().nullable(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    tag: z.string().max(30).optional().nullable(),
    due_date: z.string().optional().nullable(),
    assignee_id: z.string().uuid().optional().nullable(),
    is_completed: z.boolean().optional(),
  }),
};

module.exports = { createTaskSchema, moveTaskSchema, updateTaskSchema };
