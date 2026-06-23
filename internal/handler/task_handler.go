package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/kyzercmd/cadence/internal/middleware"
	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/service"
)

type TaskHandler struct {
	taskService service.TaskService
}

func NewTaskHandler(s service.TaskService) *TaskHandler {
	return &TaskHandler{taskService: s}
}

// GetMyTasks godoc
// @Summary      Get current user's tasks
// @Description  Fetches a list of tasks assigned to the currently authenticated user.
// @Tags         Tasks
// @Accept       json
// @Produce      json
// @Success      200  {array}   models.MyTaskResponse "List of assigned tasks"
// @Failure      401  {string}  string "Unauthorized"
// @Failure      500  {string}  string "Failed to fetch tasks"
// @Security     BearerAuth
// @Router       /users/me/tasks [get]
func (h *TaskHandler) GetMyTasks(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDkey).(string)

	tasks, err := h.taskService.GetMyTasks(r.Context(), userID)
	if err != nil {
		log.Printf("DEBUG: %v", err)
		http.Error(w, "Failed to fetch tasks", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tasks)
}

// CreateTask godoc
// @Summary      Create a new task
// @Description  Creates a new task under a specific project.
// @Tags         Tasks
// @Accept       json
// @Produce      json
// @Param        projectid path      string true "Project ID"
// @Param        payload   body      models.CreateTaskPayload true "Task creation payload"
// @Success      201       {object}  map[string]interface{} "Task created successfully"
// @Failure      400       {string}  string "Invalid request body"
// @Failure      401       {string}  string "Unauthorized"
// @Failure      500       {string}  string "Failed to create task"
// @Security     BearerAuth
// @Router       /projects/{projectid}/tasks [post]
func (h *TaskHandler) CreateTask(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectid")

	var payload models.CreateTaskPayload
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadGateway)
		return
	}

	taskID, err := h.taskService.CreateTask(r.Context(), projectID, &payload)
	if err != nil {
		http.Error(w, "Failed to create task", http.StatusInternalServerError)
		return
	}

	response := map[string]any{
		"Message": "Task created successfully",
		"TaskID":  taskID,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	json.NewEncoder(w).Encode(response)
}

// UpdateTaskStatus godoc
// @Summary      Update task status
// @Description  Updates the status of a specific task (e.g., todo, in_progress, in_review, done).
// @Tags         Tasks
// @Accept       json
// @Produce      json
// @Param        taskid  path      string true "Task ID"
// @Param        payload body      models.UpdateTaskStatusPayload true "Task status payload"
// @Success      200     {object}  map[string]interface{} "Status updated successfully"
// @Failure      400     {string}  string "Invalid request body or status"
// @Failure      401     {string}  string "Unauthorized"
// @Failure      404     {string}  string "Task not found"
// @Failure      500     {string}  string "Failed to update task status"
// @Security     BearerAuth
// @Router       /tasks/{taskid}/status [patch]
func (h *TaskHandler) UpdateTaskStatus(w http.ResponseWriter, r *http.Request) {
	taskID := r.PathValue("taskid")

	var payload models.UpdateTaskStatusPayload

	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadGateway)
		return
	}

	validStatuses := map[models.TaskStatus]bool{"todo": true, "in_progress": true, "in_review": true, "done": true}
	if !validStatuses[payload.Status] {
		http.Error(w, "Invalid status", http.StatusBadRequest)
		return
	}

	err = h.taskService.UpdateTaskStatus(r.Context(), payload.Status, taskID)
	if err != nil {
		if errors.Is(err, models.ErrTaskNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to update task status", http.StatusInternalServerError)
	}

	response := map[string]any{
		"message": "status updated successfully",
		"taskID":  taskID,
	}
	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(response)
}

// UpdateTask godoc
// @Summary      Update a task
// @Description  Fully updates an existing task's details.
// @Tags         Tasks
// @Accept       json
// @Produce      json
// @Param        taskid  path      string true "Task ID"
// @Param        payload body      models.UpdateTaskPayload true "Task update payload"
// @Success      200     {object}  map[string]interface{} "Task updated successfully"
// @Failure      400     {string}  string "Invalid request body or missing task name"
// @Failure      401     {string}  string "Unauthorized"
// @Failure      404     {string}  string "Task not found"
// @Failure      500     {string}  string "Failed to update task"
// @Security     BearerAuth
// @Router       /tasks/{taskid} [put]
func (h *TaskHandler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	taskID := r.PathValue("taskid")

	var payload models.UpdateTaskPayload

	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if payload.Name == "" {
		http.Error(w, models.ErrTaskNameRequired.Error(), http.StatusBadRequest)
		return
	}

	err = h.taskService.UpdateTask(r.Context(), taskID, &payload)
	if err != nil {
		if errors.Is(err, models.ErrTaskNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		log.Printf("DEBUG: %v", err)
		http.Error(w, "Failed to update task", http.StatusInternalServerError)
		return
	}

	response := map[string]any{
		"message": "Task updated successfully",
		"taskID":  taskID,
	}
	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(response)
}

// GetProjectTasks godoc
// @Summary      Get tasks for a project
// @Description  Fetches all tasks associated with a specific project ID (used for the Board view).
// @Tags         Tasks
// @Accept       json
// @Produce      json
// @Param        projectid path      string true "Project ID"
// @Success      200       {array}   models.BoardTaskResponse "List of project tasks"
// @Failure      401       {string}  string "Unauthorized"
// @Failure      500       {string}  string "Failed to fetch project tasks"
// @Security     BearerAuth
// @Router       /projects/{projectid}/tasks [get]
func (h *TaskHandler) GetProjectTasks(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectid")

	tasks, err := h.taskService.GetTasksByProjectID(r.Context(), projectID)
	if err != nil {
		http.Error(w, "Failed to fetch project tasks", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(tasks)
}

// GetTaskDetails godoc
// @Summary      Get task details
// @Description  Fetches the complete details of a specific task, including assignees and total spent hours.
// @Tags         Tasks
// @Accept       json
// @Produce      json
// @Param        taskid  path      string true "Task ID"
// @Success      200     {object}  models.TaskDetailResponse "Detailed task information"
// @Failure      401     {string}  string "Unauthorized"
// @Failure      404     {string}  string "Task not found"
// @Failure      500     {string}  string "Failed to fetch task details"
// @Security     BearerAuth
// @Router       /tasks/{taskid} [get]
func (h *TaskHandler) GetTaskDetails(w http.ResponseWriter, r *http.Request) {
	taskID := r.PathValue("taskid")

	task, err := h.taskService.GetTaskByID(r.Context(), taskID)
	if err != nil {
		if errors.Is(err, models.ErrTaskNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		log.Printf("DEBUG: %v", err)
		http.Error(w, "Failed to fetch task details", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(task)
}

// LogTime godoc
// @Summary      Log time on a task
// @Description  Logs hours spent on a specific task by the authenticated user. User must be assigned to the task.
// @Tags         Tasks
// @Accept       json
// @Produce      json
// @Param        taskid  path      string true "Task ID"
// @Param        payload body      models.LogTimePayload true "Hours to log"
// @Success      200     {object}  map[string]interface{} "Hours logged successfully"
// @Failure      400     {string}  string "Invalid body or hours less than zero"
// @Failure      401     {string}  string "Unauthorized"
// @Failure      403     {string}  string "User is not assigned to task"
// @Failure      500     {string}  string "Failed to log time"
// @Security     BearerAuth
// @Router       /tasks/{taskid}/time [patch]
func (h *TaskHandler) LogTime(w http.ResponseWriter, r *http.Request) {
	taskID := r.PathValue("taskid")
	userID, ok := r.Context().Value(middleware.UserIDkey).(string)

	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var payload models.LogTimePayload

	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	err = h.taskService.LogTime(r.Context(), taskID, userID, &payload)
	if err != nil {
		if errors.Is(err, models.ErrUserNotAssigned) {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		if errors.Is(err, models.ErrHoursLessThanZero) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, "Failed to log time", http.StatusInternalServerError)
		return
	}

	response := map[string]any{
		"message": "Hours logged successfully",
		"taskId":  taskID,
		"userId":  userID,
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(response)
}
