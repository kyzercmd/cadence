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

type ProjectHandler struct {
	ProjectService service.ProjectService
}

func NewProjectHandler(s service.ProjectService) *ProjectHandler {
	return &ProjectHandler{ProjectService: s}
}

func (h *ProjectHandler) CreateProject(w http.ResponseWriter, r *http.Request) {
	var payload models.CreateProjectPayload

	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if payload.Name == "" || payload.Code == "" {
		http.Error(w, "Code and project name are required", http.StatusBadRequest)
		return
	}

	projectID, err := h.ProjectService.CreateProject(r.Context(), &payload)
	if err != nil {
		if errors.Is(err, models.ErrProjectCodeExists) {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		http.Error(w, "Failed to create project", http.StatusInternalServerError)
		return
	}

	response := map[string]any{
		"message":   "Project created successfully",
		"projectId": projectID,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	json.NewEncoder(w).Encode(response)
}

func (h *ProjectHandler) GetProjects(w http.ResponseWriter, r *http.Request) {
	userID, okID := r.Context().Value(middleware.UserIDkey).(string)
	userRole, okRole := r.Context().Value(middleware.UserRoleKey).(models.Role)

	if !okID || !okRole || userID == "" || userRole == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	projects, err := h.ProjectService.GetProjects(r.Context(), userID, userRole)
	if err != nil {
		log.Printf("DEBUG: %v", err)
		http.Error(w, "Failed to fetch projects", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(projects)
}
