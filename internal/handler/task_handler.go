package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/kyzercmd/cadence/internal/middleware"
	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/repository"
	"github.com/kyzercmd/cadence/internal/service"
)

type TaskHandler struct {
	taskService service.TaskService
}

func NewTaskHandler(s service.TaskService) *TaskHandler {
	return &TaskHandler{taskService: s}
}

func (h *TaskHandler) GetMyTasks(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDkey).(string)

	tasks, err := h.taskService.GetMyTasks(r.Context(), userID)
	if err != nil {
		http.Error(w, "Failed to fetch tasks", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tasks)
}

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
		"Message": "Message created successfully",
		"TaskID":  taskID,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	json.NewEncoder(w).Encode(response)
}

func (h *TaskHandler) UpdateTaskStatus(w http.ResponseWriter, r *http.Request) {
	taskID := r.PathValue("taskid")

	var payload models.UpdateTaskStatusPayload

	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadGateway)
		return
	}

	validStatuses := map[models.TaskStatus]bool{"todo": true, "in_progress": true, "in_review": true, "done": true}
	if !validStatuses[payload.Status] {
		http.Error(w, "Invalid status", http.StatusBadRequest)
		return
	}

	err = h.taskService.UpdateTaskStatus(r.Context(), payload.Status, taskID)
	if err != nil {
		if errors.Is(err, repository.ErrTaskNotFound) {
			http.Error(w, "Task not found", http.StatusNotFound)
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

func (h *TaskHandler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	taskID := r.PathValue("taskid")

	var payload models.UpdateTaskPayload

	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if payload.Name == "" {
		http.Error(w, "Task name is required", http.StatusBadRequest)
		return
	}

	err = h.taskService.UpdateTask(r.Context(), taskID, &payload)
	if err != nil {
		if errors.Is(err, repository.ErrTaskNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
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
