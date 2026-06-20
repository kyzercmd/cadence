package handler

import (
	"encoding/json"
	"net/http"

	"github.com/kyzercmd/cadence/internal/middleware"
	"github.com/kyzercmd/cadence/internal/service"
)

type TaskHandler struct {
	taskService service.TaskService
}

func newTaskHandler(s service.TaskService) *TaskHandler {
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
