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

// CreateProject godoc
// @Summary      Create a new project
// @Description  Creates a new project in the system. Requires HR or Admin privileges.
// @Tags         Projects
// @Accept       json
// @Produce      json
// @Param        payload body models.CreateProjectPayload true "Project creation payload"
// @Success      201     {object}  map[string]interface{} "Project created successfully"
// @Failure      400     {string}  string "Invalid request body or missing code/name"
// @Failure      409     {string}  string "A project with this code already exists"
// @Failure      500     {string}  string "Failed to create project"
// @Security     BearerAuth
// @Router       /projects [post]
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

// GetProjects godoc
// @Summary      Get all projects
// @Description  Fetches a list of projects. Employees will see projects they are members of, while HR/Admins may see all projects.
// @Tags         Projects
// @Accept       json
// @Produce      json
// @Success      200     {array}   models.GetProjectResponse "List of projects"
// @Failure      401     {string}  string "Unauthorized"
// @Failure      500     {string}  string "Failed to fetch projects"
// @Security     BearerAuth
// @Router       /projects [get]
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

// GetProjectByID godoc
// @Summary      Get project details
// @Description  Fetches the details of a single project by its ID.
// @Tags         Projects
// @Accept       json
// @Produce      json
// @Param        projectid   path      string  true  "Project ID"
// @Success      200  {object}  models.GetProjectResponse "Project details"
// @Failure      401  {string}  string "Unauthorized"
// @Failure      404  {string}  string "Project not found"
// @Failure      500  {string}  string "Failed to fetch project"
// @Security     BearerAuth
// @Router       /projects/{projectid} [get]
func (h *ProjectHandler) GetProjectByID(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectid")

	project, err := h.ProjectService.GetProjectByID(r.Context(), projectID)
	if err != nil {
		if errors.Is(err, models.ErrProjectNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		log.Printf("DEBUG: %v", err)
		http.Error(w, "Failed to fetch project", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(project)
}
